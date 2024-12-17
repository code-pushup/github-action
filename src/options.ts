import * as core from '@actions/core'
import type { Options } from '@code-pushup/ci'
import type { ActionInputs } from './inputs'

export function createOptions(inputs: ActionInputs): Required<Options> {
  return {
    monorepo: inputs.monorepo,
    parallel: inputs.parallel,
    projects: inputs.projects,
    task: inputs.task,
    nxProjectsFilter: inputs.nxProjectsFilter,
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
