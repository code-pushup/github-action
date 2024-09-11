import { Enum, type InferValue } from 'better-enums'

export const MONOREPO_TOOLS = Enum(['nx', 'turbo', 'yarn', 'pnpm', 'npm'])
export type MonorepoTool = InferValue<typeof MONOREPO_TOOLS>

export type MonorepoToolHandler = {
  tool: MonorepoTool
  isConfigured: (options: MonorepoHandlerOptions) => Promise<boolean>
  listProjects: (options: MonorepoHandlerOptions) => Promise<ProjectConfig[]>
}

export type MonorepoHandlerOptions = {
  cwd: string
  silent: boolean
  task: string
}

export type ProjectConfig = {
  name: string
  bin: string
  directory?: string
}
