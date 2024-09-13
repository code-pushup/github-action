import * as actions_exec from '@actions/exec'
import { vol } from 'memfs'
import type { PackageJson } from 'type-fest'
import type { ActionInputs } from '../src/inputs'
import { listMonorepoProjects, type ProjectConfig } from '../src/monorepo'

jest.mock('fs', () => {
  const memfs: typeof import('memfs') = jest.requireActual('memfs')
  return memfs.fs
})
jest.mock('fs/promises', () => {
  const memfs: typeof import('memfs') = jest.requireActual('memfs')
  return memfs.fs.promises
})
jest.mock('node:fs', () => {
  const memfs: typeof import('memfs') = jest.requireActual('memfs')
  return memfs.fs
})
jest.mock('node:fs/promises', () => {
  const memfs: typeof import('memfs') = jest.requireActual('memfs')
  return memfs.fs.promises
})

const MEMFS_VOLUME = '/test'

describe('monorepo projects detection', () => {
  const DEFAULT_INPUTS = {
    monorepo: true,
    projects: null,
    task: 'code-pushup',
    silent: false,
    directory: MEMFS_VOLUME,
    bin: 'npx --no-install code-pushup'
  } satisfies Partial<ActionInputs>

  const pkgJsonContent = (content: PackageJson): string =>
    JSON.stringify(content)

  beforeEach(() => {
    vol.reset()
  })

  it('should detect projects in Nx monorepo', async () => {
    jest.spyOn(actions_exec, 'exec').mockResolvedValue(0)
    jest.spyOn(actions_exec, 'getExecOutput').mockResolvedValue({
      exitCode: 0,
      stdout: '["backend", "frontend"]',
      stderr: ''
    })

    vol.fromJSON(
      {
        'nx.json': '{}',
        'backend/project.json': JSON.stringify({
          name: 'backend',
          targets: { 'code-pushup': { executor: '@code-pushup/nx-plugin:cli' } }
        }),
        'frontend/project.json': JSON.stringify({
          name: 'frontend',
          targets: { 'code-pushup': { executor: '@code-pushup/nx-plugin:cli' } }
        })
      },
      MEMFS_VOLUME
    )

    await expect(listMonorepoProjects(DEFAULT_INPUTS)).resolves.toEqual<
      ProjectConfig[]
    >([
      { name: 'backend', bin: 'npx nx run backend:code-pushup --' },
      { name: 'frontend', bin: 'npx nx run frontend:code-pushup --' }
    ])
  })

  it('should detect projects in Turborepo which have code-pushup command', async () => {
    vol.fromJSON(
      {
        'package.json': pkgJsonContent({
          private: true,
          workspaces: ['frontend/*', 'backend/*'],
          devDependencies: { '@code-pushup/cli': 'latest' }
        }),
        'yarn.lock': '',
        'turbo.json': JSON.stringify({
          tasks: {
            'code-pushup': {
              env: ['CP_API_KEY'],
              outputs: ['.code-pushup']
            }
          }
        }),
        'backend/api/package.json': pkgJsonContent({
          name: 'api',
          scripts: { 'code-pushup': 'code-pushup --no-progress' }
        }),
        'backend/auth/package.json': pkgJsonContent({
          name: 'auth',
          scripts: { 'code-pushup': 'code-pushup --no-progress' }
        }),
        'e2e/package.json': pkgJsonContent({
          name: 'e2e'
        }),
        'frontend/backoffice/package.json': pkgJsonContent({
          name: 'backoffice',
          scripts: { 'code-pushup': 'code-pushup --no-progress' }
        }),
        'frontend/website/package.json': pkgJsonContent({
          name: 'website',
          scripts: { 'code-pushup': 'code-pushup --no-progress' }
        })
      },
      MEMFS_VOLUME
    )

    await expect(listMonorepoProjects(DEFAULT_INPUTS)).resolves.toEqual<
      ProjectConfig[]
    >([
      { name: 'backoffice', bin: 'npx turbo run code-pushup -F backoffice --' },
      { name: 'website', bin: 'npx turbo run code-pushup -F website --' },
      { name: 'api', bin: 'npx turbo run code-pushup -F api --' },
      { name: 'auth', bin: 'npx turbo run code-pushup -F auth --' }
    ])
  })

  it('should detect packages in PNPM workspace with code-pushup script', async () => {
    vol.fromJSON(
      {
        'package.json': pkgJsonContent({}),
        'pnpm-workspace.yaml': 'packages:\n- apps/*\n- libs/*\n\n',
        'apps/backend/package.json': pkgJsonContent({
          name: 'backend',
          scripts: { 'code-pushup': 'code-pushup' }
        }),
        'apps/frontend/package.json': pkgJsonContent({
          name: 'frontend',
          scripts: { 'code-pushup': 'code-pushup' }
        }),
        'libs/eslint-config/package.json': pkgJsonContent({
          name: '@repo/eslint-config'
        }),
        'libs/utils/package.json': pkgJsonContent({
          name: '@repo/utils',
          scripts: { 'code-pushup': 'code-pushup' }
        })
      },
      MEMFS_VOLUME
    )

    await expect(listMonorepoProjects(DEFAULT_INPUTS)).resolves.toEqual<
      ProjectConfig[]
    >([
      { name: 'backend', bin: 'pnpm -F backend run code-pushup' },
      { name: 'frontend', bin: 'pnpm -F frontend run code-pushup' },
      { name: '@repo/utils', bin: 'pnpm -F @repo/utils run code-pushup' }
    ])
  })

  it('should detect Yarn workspaces with code-pushup installed individually', async () => {
    vol.fromJSON(
      {
        'package.json': pkgJsonContent({
          private: true,
          workspaces: ['packages/*']
        }),
        'yarn.lock': '',
        'packages/cli/package.json': pkgJsonContent({
          name: 'cli',
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        }),
        'packages/core/package.json': pkgJsonContent({
          name: 'core',
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        }),
        'e2e/package.json': pkgJsonContent({
          name: 'e2e-tests'
        })
      },
      MEMFS_VOLUME
    )

    await expect(listMonorepoProjects(DEFAULT_INPUTS)).resolves.toEqual<
      ProjectConfig[]
    >([
      { name: 'cli', bin: 'yarn workspace cli exec code-pushup' },
      { name: 'core', bin: 'yarn workspace core exec code-pushup' }
    ])
  })

  it('should detect NPM workspaces when code-pushup installed at root level', async () => {
    vol.fromJSON(
      {
        'package.json': pkgJsonContent({
          private: true,
          workspaces: ['packages/*'],
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        }),
        'package-lock.json': '',
        'packages/backend/package.json': pkgJsonContent({
          name: 'backend'
        }),
        'packages/frontend/package.json': pkgJsonContent({
          name: 'frontend'
        })
      },
      MEMFS_VOLUME
    )

    await expect(listMonorepoProjects(DEFAULT_INPUTS)).resolves.toEqual<
      ProjectConfig[]
    >([
      { name: 'backend', bin: 'npm -w backend exec code-pushup --' },
      { name: 'frontend', bin: 'npm -w frontend exec code-pushup --' }
    ])
  })

  it('should list folders matching globs passed as input when no tool detected', async () => {
    vol.fromJSON(
      {
        'frontend/package.json': pkgJsonContent({
          name: 'frontend',
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        }),
        'backend/auth/package.json': pkgJsonContent({
          name: 'auth',
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        }),
        'backend/api/package.json': pkgJsonContent({
          name: 'api',
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        })
      },
      MEMFS_VOLUME
    )

    await expect(
      listMonorepoProjects({
        ...DEFAULT_INPUTS,
        monorepo: true,
        projects: ['backend/*', 'frontend']
      })
    ).resolves.toEqual<ProjectConfig[]>([
      {
        name: 'frontend',
        bin: 'npx --no-install code-pushup',
        directory: `${MEMFS_VOLUME}/frontend`
      },
      {
        name: 'backend/api',
        bin: 'npx --no-install code-pushup',
        directory: `${MEMFS_VOLUME}/backend/api`
      },
      {
        name: 'backend/auth',
        bin: 'npx --no-install code-pushup',
        directory: `${MEMFS_VOLUME}/backend/auth`
      }
    ])
  })

  it('should list all folders with a package.json when no tool detected and no patterns provided', async () => {
    vol.fromJSON(
      {
        'package.json': pkgJsonContent({
          name: 'my-app',
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        }),
        'scripts/generate-token/package.json': pkgJsonContent({}),
        'scripts/db/migrate/package.json': pkgJsonContent({}),
        'scripts/db/seed/package.json': pkgJsonContent({})
      },
      MEMFS_VOLUME
    )

    await expect(
      listMonorepoProjects({
        ...DEFAULT_INPUTS,
        monorepo: true,
        projects: null
      })
    ).resolves.toEqual<ProjectConfig[]>([
      {
        name: 'my-app',
        bin: 'npx --no-install code-pushup',
        directory: MEMFS_VOLUME
      },
      {
        name: 'generate-token',
        bin: 'npx --no-install code-pushup',
        directory: `${MEMFS_VOLUME}/scripts/generate-token`
      },
      {
        name: 'migrate',
        bin: 'npx --no-install code-pushup',
        directory: `${MEMFS_VOLUME}/scripts/db/migrate`
      },
      {
        name: 'seed',
        bin: 'npx --no-install code-pushup',
        directory: `${MEMFS_VOLUME}/scripts/db/seed`
      }
    ])
  })

  it('should prefer tool provided as input (PNPM) over tool which would be auto-detected otherwise (Turborepo)', async () => {
    vol.fromJSON(
      {
        'package.json': pkgJsonContent({
          devDependencies: { '@code-pushup/cli': '^0.42.0' }
        }),
        'pnpm-workspace.yaml': 'packages:\n- apps/*\n- packages/*\n\n',
        'turbo.json': JSON.stringify({
          tasks: {
            'code-pushup': {}
          }
        }),
        'apps/backoffice/package.json': pkgJsonContent({
          name: 'backoffice'
        }),
        'apps/frontoffice/package.json': pkgJsonContent({
          name: 'frontoffice'
        }),
        'packages/models/package.json': pkgJsonContent({
          name: '@repo/models'
        }),
        'packages/ui/package.json': pkgJsonContent({
          name: '@repo/ui'
        })
      },
      MEMFS_VOLUME
    )

    await expect(
      listMonorepoProjects({ ...DEFAULT_INPUTS, monorepo: 'pnpm' })
    ).resolves.toEqual<ProjectConfig[]>([
      { name: 'backoffice', bin: 'pnpm -F backoffice exec code-pushup' },
      { name: 'frontoffice', bin: 'pnpm -F frontoffice exec code-pushup' },
      { name: '@repo/models', bin: 'pnpm -F @repo/models exec code-pushup' },
      { name: '@repo/ui', bin: 'pnpm -F @repo/ui exec code-pushup' }
    ])
  })
})
