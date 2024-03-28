import { DefaultArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import fs from 'node:fs/promises'
import path from 'node:path'
import { simpleGit } from 'simple-git'
import { createAnnotationsFromIssues } from './annotations'
import {
  DIFF_ARTIFACT_NAME,
  REPORT_ARTIFACT_NAME,
  downloadReportArtifact
} from './artifact'
import { collect } from './collect'
import { commentOnPR } from './comment'
import { compare } from './compare'
import { listChangedFiles } from './diff'
import { parseInputs } from './inputs'
import { filterRelevantIssues } from './issues'
import type { PersistedCliFiles } from './persist'
import { isPullRequest } from './pull-request'

export async function run(
  artifact = new DefaultArtifactClient(),
  git = simpleGit()
): Promise<void> {
  try {
    const inputs = parseInputs()

    const { jsonFilePath: currReportPath, artifactData: reportArtifact } =
      await collect(inputs)
    const currReport = await fs.readFile(currReportPath, 'utf8')
    core.debug(`Collected current report at ${currReportPath}`)

    if (inputs.artifacts) {
      const { id, size } = await artifact.uploadArtifact(
        REPORT_ARTIFACT_NAME,
        reportArtifact.files,
        reportArtifact.rootDir,
        inputs.retention != null
          ? { retentionDays: inputs.retention }
          : undefined
      )
      core.setOutput('artifact-id', id)
      core.debug(`Uploaded current report artifact (${size} bytes)`)
    }

    if (isPullRequest(github.context.payload.pull_request)) {
      const { base, head } = github.context.payload.pull_request
      core.debug(`PR detected, preparing to compare base branch ${base.ref}`)

      let prevReport: string

      let cachedBaseReport: PersistedCliFiles | null = null
      if (inputs.artifacts) {
        cachedBaseReport = await downloadReportArtifact(artifact, base, inputs)
        core.debug(
          `Previous report artifact ${cachedBaseReport ? `found and downloaded to ${cachedBaseReport.jsonFilePath}` : `not found`}`
        )
      }

      if (cachedBaseReport) {
        prevReport = await fs.readFile(cachedBaseReport.jsonFilePath, 'utf8')
      } else {
        await git.fetch('origin', base.ref, ['--depth=1'])
        await git.checkout(['-f', base.ref])
        core.debug(`Switched to base branch ${base.ref}`)

        const { jsonFilePath: prevReportPath } = await collect(inputs)
        prevReport = await fs.readFile(prevReportPath, 'utf8')
        core.debug(`Collected previous report at ${prevReportPath}`)

        await git.checkout(['-f', '-'])
        core.debug('Switched back to current branch')
      }

      const reportsDir = path.join(inputs.directory, '.code-pushup')
      const currPath = path.join(reportsDir, 'curr-report.json')
      const prevPath = path.join(reportsDir, 'prev-report.json')
      await fs.writeFile(currPath, currReport)
      await fs.writeFile(prevPath, prevReport)
      core.debug(`Saved reports to ${currPath} and ${prevPath}`)

      const {
        mdFilePath: diffMdPath,
        jsonFilePath: diffJsonPath,
        artifactData: diffArtifact
      } = await compare({ before: prevPath, after: currPath }, inputs)
      core.debug(`Compared reports and generated diff at ${diffMdPath}`)

      const commentId = await commentOnPR(diffMdPath, inputs)
      core.setOutput('comment-id', commentId)
      core.debug(`Commented on PR #${github.context.issue.number}`)

      if (inputs.annotations) {
        await git.fetch('origin', base.ref, ['--depth=1'])
        const reportsDiff = await fs.readFile(diffJsonPath, 'utf8')
        const changedFiles = await listChangedFiles({ base, head }, git)
        const issues = filterRelevantIssues({
          currReport: JSON.parse(currReport),
          prevReport: JSON.parse(prevReport),
          reportsDiff: JSON.parse(reportsDiff),
          changedFiles
        })
        createAnnotationsFromIssues(issues)
        core.debug(
          `Found ${issues.length} relevant issues for ${changedFiles.length} changed files and created GitHub annotations`
        )
      }

      if (inputs.artifacts) {
        const { size } = await artifact.uploadArtifact(
          DIFF_ARTIFACT_NAME,
          diffArtifact.files,
          diffArtifact.rootDir,
          inputs.retention != null
            ? { retentionDays: inputs.retention }
            : undefined
        )
        core.debug(`Uploaded report diff artifact (${size} bytes)`)
      }
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : `${error}`)
  }
}
