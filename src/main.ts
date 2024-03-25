import { DefaultArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import fs from 'node:fs/promises'
import path from 'node:path'
import { simpleGit } from 'simple-git'
import { collect } from './collect'
import { commentOnPR } from './comment'
import { compare } from './compare'
import { parseInputs } from './inputs'

const ARTIFACT_NAME = 'code-pushup-report'

export async function run(
  artifact = new DefaultArtifactClient(),
  git = simpleGit()
): Promise<void> {
  try {
    const inputs = parseInputs()

    const { jsonFilePath: currReportPath, artifactData } = await collect(inputs)
    const currReport = await fs.readFile(currReportPath, 'utf8')
    core.debug(`Collected current report at ${currReportPath}`)

    if (inputs.artifacts) {
      const { id, size } = await artifact.uploadArtifact(
        ARTIFACT_NAME,
        artifactData.files,
        artifactData.rootDir,
        inputs.retention != null
          ? { retentionDays: inputs.retention }
          : undefined
      )
      core.setOutput('artifact-id', id)
      core.debug(`Uploaded current report artifact (${size} bytes)`)
    }

    if (github.context.payload.pull_request) {
      const baseBranch = github.context.payload.pull_request.base.ref as string
      core.debug(`PR detected, preparing to compare base branch ${baseBranch}`)

      await git.fetch('origin', baseBranch, ['--depth=1'])
      await git.checkout(['-f', baseBranch])
      core.debug(`Switched to base branch ${baseBranch}`)

      const { jsonFilePath: prevReportPath } = await collect(inputs)
      const prevReport = await fs.readFile(prevReportPath, 'utf8')
      core.debug(`Collected previous report at ${prevReportPath}`)

      await git.checkout(['-f', '-'])
      core.debug('Switched back to current branch')

      const reportsDir = path.join(inputs.directory, '.code-pushup')
      const currPath = path.join(reportsDir, 'curr-report.json')
      const prevPath = path.join(reportsDir, 'prev-report.json')
      await fs.writeFile(currPath, currReport)
      await fs.writeFile(prevPath, prevReport)
      core.debug(`Saved reports to ${currPath} and ${prevPath}`)

      const { mdFilePath: diffPath } = await compare(
        { before: prevPath, after: currPath },
        inputs
      )
      core.debug(`Compared reports and generated diff at ${diffPath}`)

      const commentId = await commentOnPR(diffPath, inputs)
      core.setOutput('comment-id', commentId)
      core.debug(`Commented on PR #${github.context.issue.number}`)
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : `${error}`)
  }
}
