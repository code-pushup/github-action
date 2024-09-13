import * as core from '@actions/core'
import { glob } from 'fast-glob'
import { join } from 'node:path'
import type { ActionInputs } from '../inputs'
import { detectMonorepoTool } from './detect-tool'
import { getToolHandler } from './handlers'
import type { MonorepoHandlerOptions, ProjectConfig } from './tools'
import { listPackages } from './utils/packages'

export async function listMonorepoProjects(
  inputs: Pick<
    ActionInputs,
    'monorepo' | 'projects' | 'task' | 'bin' | 'directory' | 'silent'
  >
): Promise<ProjectConfig[]> {
  if (!inputs.monorepo) {
    throw new Error('Monorepo mode not enabled')
  }

  const options: MonorepoHandlerOptions = {
    task: inputs.task,
    cwd: inputs.directory,
    silent: inputs.silent
  }

  const tool =
    inputs.monorepo === true
      ? await detectMonorepoTool(options)
      : inputs.monorepo
  if (inputs.monorepo === true) {
    if (tool) {
      core.info(`Auto-detected monorepo tool ${tool}`)
    } else {
      core.info("Couldn't auto-detect any supported monorepo tool")
    }
  } else {
    core.info(`Using monorepo tool "${tool}" from inputs`)
  }

  if (tool) {
    const handler = getToolHandler(tool)
    const projects = await handler.listProjects(options)
    core.info(`Found ${projects.length} projects in ${tool} monorepo`)
    core.debug(`Projects: ${projects.map(({ name }) => name).join(', ')}`)
    return projects
  }

  if (inputs.projects) {
    const directories = await glob(inputs.projects, {
      cwd: options.cwd,
      onlyDirectories: true
    })
    core.info(
      `Found ${directories.length} project folders matching "${inputs.projects}" from inputs`
    )
    core.debug(`Projects: ${directories.join(', ')}`)
    return directories.map(directory => ({
      name: directory,
      bin: inputs.bin,
      directory: join(options.cwd, directory)
    }))
  }

  const packages = await listPackages(options.cwd)
  core.info(`Found ${packages.length} NPM packages in repository`)
  core.debug(`Projects: ${packages.map(({ name }) => name).join(', ')}`)
  return packages.map(({ name, directory }) => ({
    name,
    bin: inputs.bin,
    directory
  }))
}
