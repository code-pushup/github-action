import { join } from 'node:path'
import type { MonorepoToolHandler } from '../tools'
import { fileExists } from '../utils/fs'
import {
  hasCodePushUpDependency,
  hasScript,
  hasWorkspacesEnabled,
  listWorkspaces
} from '../utils/packages'

export const npmHandler: MonorepoToolHandler = {
  tool: 'npm',
  async isConfigured(options) {
    return (
      (await fileExists(join(options.cwd, 'package-lock.json'))) &&
      (await hasWorkspacesEnabled(options.cwd))
    )
  },
  async listProjects(options) {
    const { workspaces, rootPackageJson } = await listWorkspaces(options.cwd)
    return workspaces
      .filter(
        ({ packageJson }) =>
          hasScript(packageJson, options.task) ||
          hasCodePushUpDependency(packageJson) ||
          hasCodePushUpDependency(rootPackageJson)
      )
      .map(({ name, packageJson }) => ({
        name,
        bin: hasScript(packageJson, options.task)
          ? `npm -w ${name} run ${options.task} --`
          : `npm -w ${name} exec ${options.task} --`
      }))
  }
}
