import * as core from '@actions/core'
import {
  isMonorepoTool,
  MONOREPO_TOOLS,
  parseConfigPatternsFromString,
  type ConfigPatterns,
  type MonorepoTool
} from '@code-pushup/ci'
import { coerceBooleanValue } from '@code-pushup/utils'

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
  skipComment: boolean
  configPatterns: ConfigPatterns | null
  searchCommits: boolean | number
}

export function parseInputs(): ActionInputs {
  const monorepo = parseMonorepoInput(core.getInput('monorepo'))
  const parallel = getBoolOrCountInput('parallel')
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
  const skipComment = core.getBooleanInput('skipComment')
  const configPatterns = parseConfigPatternsFromString(
    core.getInput('configPatterns')
  )
  const searchCommits = getBoolOrCountInput('searchCommits')

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
    annotations,
    skipComment,
    configPatterns,
    searchCommits
  }
}

function parseInteger(value: string): number | null {
  const int = Number.parseInt(value, 10)
  if (Number.isNaN(int)) {
    return null
  }
  return int
}

function getBoolOrCountInput(name: keyof ActionInputs): boolean | number {
  const value = parseBoolOrCountInput(core.getInput(name))
  if (value == null) {
    throw new Error(
      `Invalid value for ${name} input, expected boolean or positive integer`
    )
  }
  return value
}

function parseBoolOrCountInput(value: string): boolean | number | null {
  if (!value) {
    return false
  }
  const bool = coerceBooleanValue(value)
  if (bool != null) {
    return bool
  }
  const int = parseInteger(value)
  if (int == null || int < 1) {
    return null
  }
  return int
}

function parseMonorepoInput(value: string): boolean | MonorepoTool {
  if (!value) {
    return false
  }
  const bool = coerceBooleanValue(value)
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
