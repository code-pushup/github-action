import { exec } from '@actions/exec'
import type { CommandContext } from '../context'
import {
  persistCliOptions,
  persistedCliFiles,
  type PersistedCliFiles
} from '../persist'

export async function mergeDiffs(
  files: string[],
  { bin, config, directory, silent }: CommandContext
): Promise<PersistedCliFiles<'md'>> {
  await exec(
    bin,
    [
      'merge-diffs',
      ...files.map(file => `--files=${file}`),
      ...(config ? [`--config=${config}`] : []),
      ...persistCliOptions({ directory })
    ],
    { cwd: directory, silent }
  )

  return persistedCliFiles({ directory, isDiff: true, formats: ['md'] })
}
