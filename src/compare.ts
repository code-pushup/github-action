import { exec } from '@actions/exec'
import path from 'node:path'
import type { ActionInputs } from './inputs'

type CompareOptions = {
  before: string
  after: string
}

export async function compare(
  { before, after }: CompareOptions,
  { bin, config, directory, silent }: ActionInputs
): Promise<string> {
  const outputDir = '.code-pushup'
  const filename = 'report'
  const outputPath = path.join(directory, outputDir, `${filename}-diff.md`)

  await exec(
    bin,
    [
      'compare',
      `--before=${before}`,
      `--after=${after}`,
      ...(config ? [`--config=${config}`] : []),
      `--persist.outputDir=${outputDir}`,
      `--persist.filename=${filename}`,
      '--persist.format=json',
      '--persist.format=md'
    ],
    { cwd: directory, silent }
  )

  return outputPath
}
