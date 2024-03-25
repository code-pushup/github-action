import type { ArtifactClient, UploadArtifactResponse } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { Context } from '@actions/github/lib/context'
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { simpleGit, type SimpleGit } from 'simple-git'
import type { ActionInputs } from '../src/inputs'
import { run } from '../src/main'

jest.mock('@actions/core')
jest.mock('@actions/github')

describe('code-pushup action', () => {
  const workDir = join('tmp', 'git-repo')

  let git: SimpleGit
  let artifact: ArtifactClient

  let cwdSpy: jest.SpiedFunction<typeof process.cwd>

  beforeEach(async () => {
    jest.clearAllMocks()

    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(workDir)

    // uncomment to see debug logs
    // jest.spyOn(core, 'debug').mockImplementation(console.debug)
    // jest.spyOn(core, 'isDebug').mockReturnValue(true)

    jest.spyOn(core, 'getInput').mockImplementation((name: string): string => {
      switch (name as keyof ActionInputs) {
        case 'token':
          return '<mock-github-token>'
        case 'bin':
          return 'npx code-pushup'
        case 'directory':
          return workDir
        case 'retention':
          return '14'
        default:
          return ''
      }
    })
    jest
      .spyOn(core, 'getBooleanInput')
      .mockImplementation((name: string): boolean => {
        switch (name as keyof ActionInputs) {
          case 'silent':
            return true
          case 'artifacts':
            return true
          default:
            return false
        }
      })

    // @ts-expect-error context is readonly
    github.context = {
      repo: {
        owner: 'dunder-mifflin',
        repo: 'website'
      },
      payload: {},
      get issue() {
        return {
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          number:
            github.context.payload.pull_request?.number ??
            github.context.payload.number
        }
      }
    } as Context

    const mockOctokit = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paginate: (async () => []) as any,
      rest: {
        issues: {
          createComment: async () =>
            ({
              data: { id: 10 }
            }) as RestEndpointMethodTypes['issues']['createComment']['response'],
          updateComment: async ({
            comment_id
          }: RestEndpointMethodTypes['issues']['updateComment']['parameters']) =>
            ({
              data: { id: comment_id }
            }) as RestEndpointMethodTypes['issues']['updateComment']['response']
        }
      }
    } as ReturnType<typeof github.getOctokit>
    jest.spyOn(github, 'getOctokit').mockReturnValue(mockOctokit)

    artifact = {
      uploadArtifact: jest.fn().mockResolvedValue({
        id: 123
      } as UploadArtifactResponse) as ArtifactClient['uploadArtifact']
    } as ArtifactClient

    await rm(workDir, { recursive: true, force: true })
    await mkdir(workDir, { recursive: true })
    await copyFile(
      join(__dirname, 'fixtures', 'code-pushup.config.ts'),
      join(workDir, 'code-pushup.config.ts')
    )
    await writeFile(join(workDir, 'index.js'), 'console.log("Hello, world!")')

    git = simpleGit(workDir)

    jest.spyOn(git, 'fetch').mockImplementation()

    await git.init()
    await git.addConfig('user.name', 'John Doe')
    await git.addConfig('user.email', 'john.doe@example.com')
    await git.branch(['-M', 'main'])

    await git.add('index.js')
    await git.add('code-pushup.config.ts')
    await git.commit('Initial commit')
  })

  afterAll(async () => {
    cwdSpy.mockRestore()

    await rm(workDir, { recursive: true, force: true })
  })

  describe('push event', () => {
    beforeEach(async () => {
      github.context.payload = {}

      await git.checkout('main')
    })

    it('should collect report', async () => {
      await run(artifact, git)

      expect(core.setFailed).not.toHaveBeenCalled()

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(artifact.uploadArtifact).toHaveBeenCalledWith<
        Parameters<ArtifactClient['uploadArtifact']>
      >(
        'code-pushup-report',
        ['report.json', 'report.md'],
        resolve(join(workDir, '.code-pushup')),
        { retentionDays: 14 }
      )

      expect(core.setOutput).toHaveBeenCalledWith('artifact-id', 123)

      const jsonPromise = readFile(
        join(workDir, '.code-pushup/report.json'),
        'utf8'
      )
      await expect(jsonPromise).resolves.toBeTruthy()
      const report = JSON.parse(await jsonPromise) as Report
      expect(report).toEqual(
        expect.objectContaining({
          plugins: [
            expect.objectContaining({
              slug: 'ts-migration',
              audits: [
                expect.objectContaining({
                  score: 0.5,
                  displayValue: '50% converted'
                })
              ]
            })
          ]
        })
      )
    })
  })

  describe('pull request event', () => {
    beforeEach(async () => {
      github.context.payload = {
        pull_request: {
          number: 42,
          base: {
            ref: 'main'
          }
        }
      }

      await git.checkoutLocalBranch('feature-1')

      await rename(join(workDir, 'index.js'), join(workDir, 'index.ts'))

      await git.add('index.ts')
      await git.commit('Convert JS file to TS')
    })

    it('should compare reports', async () => {
      await run(artifact, git)

      expect(core.setFailed).not.toHaveBeenCalled()

      expect(core.setOutput).toHaveBeenCalledWith('comment-id', 10)

      const mdPromise = readFile(
        join(workDir, '.code-pushup/report-diff.md'),
        'utf8'
      )
      await expect(mdPromise).resolves.toBeTruthy()
      const md = await mdPromise
      expect(
        md.replace(/(?<=commit )`[\da-f]{7}`/g, '`<commit-sha>`')
      ).toMatchSnapshot()
    })
  })
})
