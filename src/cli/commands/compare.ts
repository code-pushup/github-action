import { exec } from '@actions/exec'
import type { CommandContext } from '../context'
import {
  persistCliOptions,
  persistedCliFiles,
  type PersistedCliFiles
} from '../persist'

type CompareOptions = {
  before: string
  after: string
  label?: string
}

export async function compare(
  { before, after, label }: CompareOptions,
  { bin, config, directory, silent, project }: CommandContext
): Promise<PersistedCliFiles> {
  await exec(
    bin,
    [
      'compare',
      `--before=${before}`,
      `--after=${after}`,
      ...(label ? [`--label=${label}`] : []),
      ...(config ? [`--config=${config}`] : []),
      ...persistCliOptions({ directory, project })
    ],
    { cwd: directory, silent }
  )

  return persistedCliFiles({ directory, isDiff: true, project })
}
