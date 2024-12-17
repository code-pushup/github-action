import * as core from '@actions/core'
import {
  MONOREPO_TOOLS,
  isMonorepoTool,
  type MonorepoTool
} from '@code-pushup/ci'

export type ActionInputs = {
  monorepo: boolean | MonorepoTool
  parallel: boolean | number
  projects: string[] | null
  task: string
  nxProjectsFilter: string
  token: string
  bin: string
  config: string | null
  directory: string
  silent: boolean
  artifacts: boolean
  retention: number | null
  annotations: boolean
}

export function parseInputs(): ActionInputs {
  const monorepo = parseMonorepoInput(core.getInput('monorepo'))
  const parallel = parseParallelInput(core.getInput('parallel'))
  const projects = parseProjectsInput(core.getInput('projects'))
  const task = core.getInput('task')
  const nxProjectsFilter = core.getInput('nxProjectsFilter')
  const token = core.getInput('token')
  const config = core.getInput('config') || null
  const directory = core.getInput('directory') || process.cwd()
  const bin = core.getInput('bin')
  const silent = core.getBooleanInput('silent')
  const artifacts = core.getBooleanInput('artifacts')
  const retention = parseInteger(core.getInput('retention'))
  const annotations = core.getBooleanInput('annotations')

  return {
    monorepo,
    parallel,
    projects,
    task,
    nxProjectsFilter,
    token,
    bin,
    config,
    directory,
    silent,
    artifacts,
    retention,
    annotations
  }
}

function parseInteger(value: string): number | null {
  const int = Number.parseInt(value, 10)
  if (Number.isNaN(int)) {
    return null
  }
  return int
}

function parseBoolean(value: string): boolean | null {
  if (['false', 'False', 'FALSE'].includes(value)) {
    return false
  }
  if (['true', 'True', 'TRUE'].includes(value)) {
    return true
  }
  return null
}

function parseMonorepoInput(value: string): boolean | MonorepoTool {
  if (!value) {
    return false
  }
  const bool = parseBoolean(value)
  if (bool != null) {
    return bool
  }

  if (isMonorepoTool(value)) {
    return value
  }
  throw new Error(
    `Invalid value for monorepo input, expected boolean or one of ${MONOREPO_TOOLS.join('/')}`
  )
}

function parseProjectsInput(value: string): string[] | null {
  if (!value) {
    return null
  }
  return value.split(',').map(item => item.trim())
}

function parseParallelInput(value: string): boolean | number {
  if (!value) {
    return false
  }
  const bool = parseBoolean(value)
  if (bool != null) {
    return bool
  }
  const int = parseInteger(value)
  if (int == null || int < 1) {
    throw new Error(
      'Invalid value for parallel input, expected boolean or positive integer'
    )
  }
  return int
}
