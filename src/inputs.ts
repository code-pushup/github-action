import * as core from '@actions/core'
import path from 'node:path'

export type ActionInputs = {
  token: string
  bin: string
  config: string | null
  directory: string
  silent: boolean
}

export function parseInputs(): ActionInputs {
  const token = core.getInput('token')
  const config = core.getInput('config') || null
  const directory = path.resolve(core.getInput('directory') || process.cwd())
  const bin = core.getInput('bin')
  const silent = core.getBooleanInput('silent')

  return {
    token,
    bin,
    config,
    directory,
    silent
  }
}
