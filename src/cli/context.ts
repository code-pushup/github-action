import type { ActionInputs } from '../inputs'

export type CommandContext = Pick<
  ActionInputs,
  'bin' | 'config' | 'directory' | 'silent'
> & {
  project?: string
}
