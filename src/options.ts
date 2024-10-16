import core from '@actions/core'
import type { Options } from '@code-pushup/ci'
import type { ActionInputs } from './inputs'

export function createOptions(inputs: ActionInputs): Required<Options> {
  return {
    monorepo: inputs.monorepo,
    projects: inputs.projects,
    task: inputs.task,
    directory: inputs.directory,
    bin: inputs.bin,
    config: inputs.config,
    detectNewIssues: inputs.annotations,
    silent: inputs.silent,
    debug: core.isDebug(),
    logger: {
      error: core.error,
      warn: core.warning,
      info: core.info,
      debug: core.debug
    }
  }
}
