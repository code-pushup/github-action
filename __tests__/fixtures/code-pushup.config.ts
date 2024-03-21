import type { CoreConfig } from '@code-pushup/models'
import { crawlFileSystem } from '@code-pushup/utils'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const config: CoreConfig = {
  plugins: [
    {
      slug: 'ts-migration',
      title: 'TypeScript migration',
      icon: 'typescript',
      audits: [
        {
          slug: 'ts-files',
          title: 'Source files converted from JavaScript to TypeScript'
        }
      ],
      runner: async () => {
        const paths = await crawlFileSystem({
          directory: fileURLToPath(dirname(import.meta.url)),
          pattern: /\.[jt]s$/
        })
        const jsFileCount = paths.filter(path => path.endsWith('.js')).length
        const tsFileCount = paths.filter(path => path.endsWith('.ts')).length
        const ratio = tsFileCount / (jsFileCount + tsFileCount)
        const percentage = Math.round(ratio * 100)
        return [
          {
            slug: 'ts-files',
            value: percentage,
            score: ratio,
            displayValue: `${percentage}% converted`
          }
        ]
      }
    }
  ]
}

export default config
