import { exec } from '@actions/exec'
import path from 'node:path'
import type { ActionInputs } from './inputs'

export async function collect({
  bin,
  config,
  directory,
  silent
}: ActionInputs): Promise<string> {
  const outputDir = '.code-pushup'
  const filename = 'report'
  const outputPath = path.join(directory, outputDir, `${filename}.json`)

  await exec(
    bin,
    [
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
