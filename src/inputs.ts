import * as core from '@actions/core'
import path from 'node:path'

export type ActionInputs = {
  token: string
  bin: string
  config: string | null
  directory: string
  silent: boolean
  artifacts: boolean
  retention: number | null
}

export function parseInputs(): ActionInputs {
  const token = core.getInput('token')
  const config = core.getInput('config') || null
  const directory = path.resolve(core.getInput('directory') || process.cwd())
  const bin = core.getInput('bin')
  const silent = core.getBooleanInput('silent')
  const artifacts = core.getBooleanInput('artifacts')
  const retention = parseInteger(core.getInput('retention'))

  return {
    token,
    bin,
    config,
    directory,
    silent,
    artifacts,
    retention
  }
}

function parseInteger(value: string): number | null {
  const int = Number.parseInt(value, 10)
  if (Number.isNaN(int)) {
    return null
  }
  return int
}
