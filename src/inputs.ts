import core from '@actions/core'
import type { Settings } from '@code-pushup/ci'
import { resolve } from 'node:path'

type MonorepoInput = Settings['monorepo']
type MonorepoTool = Exclude<MonorepoInput, boolean>

export type ActionInputs = {
  monorepo: MonorepoInput
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
  const directory = resolve(core.getInput('directory') || process.cwd())
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

function parseMonorepoInput(value: string): Settings['monorepo'] {
  if (!value || ['false', 'False', 'FALSE'].includes(value)) {
    return false
  }
  if (['true', 'True', 'TRUE'].includes(value)) {
    return true
  }

  const tools = Object.values({
    npm: 'npm',
    nx: 'nx',
    pnpm: 'pnpm',
    turbo: 'turbo',
    yarn: 'yarn'
  } satisfies { [T in MonorepoTool]: T })

  for (const tool of tools) {
    if (value === tool) {
      return value
    }
  }
  throw new Error(
    `Invalid value for monorepo input, expected boolean or one of ${tools.join('/')}`
  )
}

function parseProjectsInput(value: string): string[] | null {
  if (!value) {
    return null
  }
  return value.split(',').map(item => item.trim())
}
