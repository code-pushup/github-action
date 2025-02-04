import { DefaultArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { runInCI } from '@code-pushup/ci'
import { simpleGit } from 'simple-git'
import { createAnnotationsFromIssues } from './annotations'
import { GitHubApiClient } from './api'
import {
  createDiffArtifactName,
  createReportArtifactName,
  uploadArtifact
} from './artifact'
import { parseInputs } from './inputs'
import { createOptions } from './options'
import { parseGitRefs } from './refs'

export async function run(
  artifact = new DefaultArtifactClient(),
  getOctokit = github.getOctokit,
  git = simpleGit()
): Promise<void> {
  try {
    const inputs = parseInputs()

    const refs = parseGitRefs()
    const api = new GitHubApiClient(inputs.token, refs, artifact, getOctokit)
    const options = createOptions(inputs)

    const result = await runInCI(refs, api, options, git)

    if (result.commentId != null) {
      core.setOutput('comment-id', result.commentId)
      core.info(`Commented on PR #${github.context.issue.number}`)
    }

    const diffFiles =
      result.mode === 'standalone'
        ? Object.values(result.files.diff ?? {})
        : result.diffPath
          ? [result.diffPath]
          : []
    if (diffFiles.length > 0) {
      await uploadArtifact(
        artifact,
        createDiffArtifactName(),
        diffFiles,
        inputs
      )
    }

    if (result.mode === 'standalone') {
      const id = await uploadArtifact(
        artifact,
        createReportArtifactName(),
        Object.values(result.files.report),
        inputs
      )
      core.setOutput('artifact-id', id)
    } else {
      for (const project of result.projects) {
        await uploadArtifact(
          artifact,
          createReportArtifactName(project.name),
          Object.values(project.files.report),
          inputs
        )
        if (project.files.diff) {
          uploadArtifact(
            artifact,
            createDiffArtifactName(project.name),
            Object.values(project.files.diff),
            inputs
          )
        }
      }
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
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : `${error}`)
  }
}
