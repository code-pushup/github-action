import * as core from '@actions/core'
import type { Options } from '@code-pushup/ci'
import type { ActionInputs } from './inputs'

function isDebugActive(): boolean {
  return (
    // checks just RUNNER_DEBUG env variable
    core.isDebug() ||
    // docs mention ACTIONS prefixed debug variables https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows/enabling-debug-logging
    process.env['ACTIONS_RUNNER_DEBUG'] === 'true' ||
    process.env['ACTIONS_STEP_DEBUG'] === 'true'
  )
}

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
    skipComment: inputs.skipComment,
    silent: inputs.silent,
    configPatterns: inputs.configPatterns,
    searchCommits: inputs.searchCommits,
    debug: isDebugActive(),
    logger: {
      error: core.error,
      warn: core.warning,
      info: core.info,
      debug: core.debug
    }
  }
}
