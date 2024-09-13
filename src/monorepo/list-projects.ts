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

  if (tool) {
    const handler = getToolHandler(tool)
    return handler.listProjects(options)
  }

  if (inputs.projects) {
    const directories = await glob(inputs.projects, {
      cwd: options.cwd,
      onlyDirectories: true
    })
    return directories.map(directory => ({
      name: directory,
      bin: inputs.bin,
      directory: join(options.cwd, directory)
    }))
  }

  const packages = await listPackages(options.cwd)
  return packages.map(({ name, directory }) => ({
    name,
    bin: inputs.bin,
    directory
  }))
}
