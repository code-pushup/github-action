import { exec } from '@actions/exec'
import type { ActionInputs } from './inputs'
import {
  persistCliOptions,
  persistedCliFiles,
  type PersistedCliFiles
} from './persist'

export async function collect({
  bin,
  config,
  directory,
  silent
}: ActionInputs): Promise<PersistedCliFiles> {
  await exec(
    bin,
    [...(config ? [`--config=${config}`] : []), ...persistCliOptions()],
    { cwd: directory, silent }
  )

  return persistedCliFiles({ directory })
}
