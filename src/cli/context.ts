import type { ActionInputs } from '../inputs'
import type { ProjectConfig } from '../monorepo'

export type CommandContext = Pick<
  ActionInputs,
  'bin' | 'config' | 'directory' | 'silent'
> & {
  project?: string
}

export function createCommandContext(
  inputs: ActionInputs,
  project: ProjectConfig | null | undefined
): CommandContext {
  return {
    project: project?.name,
    bin: project?.bin ?? inputs.bin,
    directory: project?.directory ?? inputs.directory,
    config: inputs.config,
    silent: inputs.silent
  }
}
