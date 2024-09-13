import { join } from 'node:path'
import type { MonorepoToolHandler } from '../tools'
import { fileExists, readJsonFile } from '../utils/fs'
import { npmHandler } from './npm'
import { pnpmHandler } from './pnpm'
import { yarnHandler } from './yarn'

const WORKSPACE_HANDLERS = [pnpmHandler, yarnHandler, npmHandler]

type TurboConfig = {
  tasks: Record<string, object>
}

export const turboHandler: MonorepoToolHandler = {
  tool: 'turbo',
  async isConfigured(options) {
    const configPath = join(options.cwd, 'turbo.json')
    return (
      (await fileExists(configPath)) &&
      options.task in (await readJsonFile<TurboConfig>(configPath)).tasks
    )
  },
  async listProjects(options) {
    for (const handler of WORKSPACE_HANDLERS) {
      if (await handler.isConfigured(options)) {
        const projects = await handler.listProjects(options)
        return projects.map(({ name }) => ({
          name,
          bin: `npx turbo run ${options.task} -F ${name} --`
        }))
      }
    }
    throw new Error(
      `Package manager for Turborepo not found, expected one of ${WORKSPACE_HANDLERS.map(({ tool }) => tool).join('/')}`
    )
  }
}
