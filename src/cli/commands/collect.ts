import { exec } from '@actions/exec'
import type { CommandContext } from '../context'
import {
  persistCliOptions,
  persistedCliFiles,
  type PersistedCliFiles
} from '../persist'

export async function collect({
  bin,
  config,
  directory,
  silent,
  project
}: CommandContext): Promise<PersistedCliFiles> {
  await exec(
    bin,
    [...(config ? [`--config=${config}`] : []), ...persistCliOptions(project)],
    { cwd: directory, silent }
  )

  return persistedCliFiles({ directory, project })
}
