import { exec } from '@actions/exec'
import { join } from 'node:path'
import type { MonorepoToolHandler } from '../tools'
import { stringifyError } from '../utils/errors'
import { executeProcess } from '../utils/exec'
import { fileExists } from '../utils/fs'

export const nxHandler: MonorepoToolHandler = {
  tool: 'nx',
  async isConfigured(options) {
    return (
      (await fileExists(join(options.cwd, 'nx.json'))) &&
      (await exec('npx', ['nx', 'report'], options)) === 0
    )
  },
  async listProjects(options) {
    const stdout = await executeProcess(
      'npx',
      ['nx', 'show', 'projects', `--with-target=${options.task}`, '--json'],
      options
    )
    const projects = parseProjects(stdout)
    return projects.map(project => ({
      name: project,
      bin: `npx nx run ${project}:${options.task} --`
    }))
  }
}

function parseProjects(stdout: string): string[] {
  let json: unknown
  try {
    json = JSON.parse(stdout)
  } catch (err) {
    throw new Error(
      `Invalid non-JSON output from 'nx show projects' - ${stringifyError(err)}`
    )
  }

  if (Array.isArray(json) && json.every(item => typeof item === 'string')) {
    return json
  }
  throw new Error(
    `Invalid JSON output from 'nx show projects', expected array of strings, received ${JSON.stringify(json)}`
  )
}
