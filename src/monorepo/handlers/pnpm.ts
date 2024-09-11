import { join } from 'node:path'
import type { MonorepoToolHandler } from '../tools'
import { fileExists, readYamlFile } from '../utils/fs'
import {
  hasCodePushUpDependency,
  hasScript,
  listPackages,
  readRootPackageJson
} from '../utils/packages'

const WORKSPACE_FILE = 'pnpm-workspace.yaml'

export const pnpmHandler: MonorepoToolHandler = {
  tool: 'pnpm',
  async isConfigured(options) {
    return (
      (await fileExists(join(options.cwd, WORKSPACE_FILE))) &&
      (await fileExists(join(options.cwd, 'package.json')))
    )
  },
  async listProjects(options) {
    const workspace = await readYamlFile<{ packages?: string[] }>(
      join(options.cwd, WORKSPACE_FILE)
    )
    const packages = await listPackages(options.cwd, workspace.packages)
    const rootPackageJson = await readRootPackageJson(options.cwd)
    return packages
      .filter(
        ({ packageJson }) =>
          !hasScript(packageJson, options.task) &&
          !hasCodePushUpDependency(packageJson) &&
          !hasCodePushUpDependency(rootPackageJson)
      )
      .map(({ name, packageJson }) => ({
        name,
        bin: hasScript(packageJson, options.task)
          ? `pnpm run ${options.task} -F ${name}`
          : `pnpm -F ${name} exec ${options.task}`
      }))
  }
}
