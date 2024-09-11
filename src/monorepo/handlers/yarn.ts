import { join } from 'node:path'
import type { MonorepoToolHandler } from '../tools'
import { fileExists } from '../utils/fs'
import {
  hasCodePushUpDependency,
  hasScript,
  hasWorkspacesEnabled,
  listWorkspaces
} from '../utils/packages'

export const yarnHandler: MonorepoToolHandler = {
  tool: 'yarn',
  async isConfigured(options) {
    return (
      (await fileExists(join(options.cwd, 'yarn.lock'))) &&
      (await hasWorkspacesEnabled(options.cwd))
    )
  },
  async listProjects(options) {
    const { workspaces, rootPackageJson } = await listWorkspaces(options.cwd)
    return workspaces
      .filter(
        ({ packageJson }) =>
          !hasScript(packageJson, options.task) &&
          !hasCodePushUpDependency(packageJson) &&
          !hasCodePushUpDependency(rootPackageJson)
      )
      .map(({ name, packageJson }) => ({
        name,
        bin: hasScript(packageJson, options.task)
          ? `yarn workspace ${name} run ${options.task}`
          : `yarn workspace ${name} exec ${options.task}`
      }))
  }
}
