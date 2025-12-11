import { DefaultArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { runInCI } from '@code-pushup/ci'
import { logger } from '@code-pushup/utils'
import { simpleGit } from 'simple-git'
import { createAnnotationsFromIssues } from './annotations'
import { GitHubApiClient } from './api'
import { REPORT_ARTIFACT_NAME, uploadArtifact } from './artifact'
import { authenticate } from './auth'
import { isDebugActive } from './debug'
import { parseInputs } from './inputs'
import { createOptions } from './options'
import { parseGitRefs } from './refs'

const LOG_PREFIX = '[Code PushUp GitHub action]'

export async function run(
  artifact = new DefaultArtifactClient(),
  getOctokit = github.getOctokit,
  git = simpleGit()
): Promise<void> {
  const inputs = parseInputs()
  const options = createOptions(inputs)

  if (isDebugActive()) {
    logger.setVerbose(true)
  }

  const [nodeMajorString] = (
    process.version.startsWith('v') ? process.version.slice(1) : process.version
  ).split('.')
  const majorVersion = parseInt(nodeMajorString, 10)
  const isUnsupportedVersion = majorVersion < 20

  if (isUnsupportedVersion) {
    core.warning(
      `${LOG_PREFIX} Internal runner is using unsupported NodeJS version ${process.version}`
    )
  } else {
    core.debug(
      `${LOG_PREFIX} Internal runner is using NodeJS version ${process.version}`
    )
  }

  const refs = parseGitRefs()

  const token = await authenticate(github.context.repo, inputs.token)

  const api = new GitHubApiClient(token, refs, artifact, getOctokit)

  const result = await runInCI(refs, api, options, git)

  if (result.commentId != null) {
    core.setOutput('comment-id', result.commentId)
    core.info(`Commented on PR #${github.context.issue.number}`)
  }

  const artifactFiles =
    result.mode === 'standalone'
      ? [
          ...Object.values(result.files.current),
          ...Object.values(result.files.previous ?? {}),
          ...Object.values(result.files.comparison ?? {})
        ]
      : [
          ...Object.values(result.files?.comparison ?? {}),
          ...result.projects.flatMap(({ files }) => [
            ...Object.values(files.current),
            ...Object.values(files.previous ?? {}),
            ...Object.values(files.comparison ?? {})
          ])
        ]

  if (artifactFiles.length > 0) {
    const id = await uploadArtifact(
      artifact,
      REPORT_ARTIFACT_NAME,
      artifactFiles,
      inputs
    )
    core.setOutput('artifact-id', id)
  }

  if (inputs.annotations) {
    const issues =
      result.mode === 'standalone'
        ? (result.newIssues ?? [])
        : result.projects.flatMap(project => project.newIssues ?? [])
    if (issues.length > 0) {
      core.info(
        `Found ${issues.length} new issues, creating GitHub annotations`
      )
      createAnnotationsFromIssues(issues)
    } else {
      core.info('No new issues found, skipping GitHub annotations')
    }
  }

  core.info(`${LOG_PREFIX} Finished running successfully`)
}
