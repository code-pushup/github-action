import * as core from '@actions/core'
import path from 'node:path'
import { MONOREPO_TOOLS, type MonorepoTool } from './monorepo'

export type ActionInputs = {
  monorepo: boolean | MonorepoTool
  projects: string[] | null
  task: string
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
  const projects = parseProjectsInput(core.getInput('projects'))
  const task = core.getInput('task')
  const token = core.getInput('token')
  const config = core.getInput('config') || null
  const directory = path.resolve(core.getInput('directory') || process.cwd())
  const bin = core.getInput('bin')
  const silent = core.getBooleanInput('silent')
  const artifacts = core.getBooleanInput('artifacts')
  const retention = parseInteger(core.getInput('retention'))
  const annotations = core.getBooleanInput('annotations')

  return {
    monorepo,
    projects,
    task,
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

function parseMonorepoInput(value: string): boolean | MonorepoTool {
  if (!value || ['false', 'False', 'FALSE'].includes(value)) {
    return false
  }
  if (['true', 'True', 'TRUE'].includes(value)) {
    return true
  }
  if (MONOREPO_TOOLS.hasValue(value)) {
    return value
  }
  throw new Error(
    `Invalid value for monorepo input, expected boolean or one of ${MONOREPO_TOOLS.values().join('/')}`
  )
}

function parseProjectsInput(value: string): string[] | null {
  if (!value) {
    return null
  }
  return value.split(',').map(item => item.trim())
}
