import { exec } from '@actions/exec'
import type { ActionInputs } from './inputs'
import {
  persistCliOptions,
  persistedCliFiles,
  type PersistedCliFiles
} from './persist'

type CompareOptions = {
  before: string
  after: string
}

export async function compare(
  { before, after }: CompareOptions,
  { bin, config, directory, silent }: ActionInputs
): Promise<PersistedCliFiles> {
  await exec(
    bin,
    [
      'compare',
      `--before=${before}`,
      `--after=${after}`,
      ...(config ? [`--config=${config}`] : []),
      ...persistCliOptions()
    ],
    { cwd: directory, silent }
  )

  return persistedCliFiles({ directory, isDiff: true })
}
