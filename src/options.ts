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
    skipComment: inputs.skipComment,
    silent: inputs.silent,
    configPatterns: inputs.configPatterns,
    searchCommits: inputs.searchCommits,
    jobId: inputs.jobId
  }
}
