import { DefaultArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import fs from 'node:fs/promises'
import path from 'node:path'
import { simpleGit, type SimpleGit } from 'simple-git'
import { createAnnotationsFromIssues } from './annotations'
import {
  createDiffArtifactName,
  createReportArtifactName,
  downloadReportArtifact
} from './artifact'
import {
  collect,
  compare,
  mergeDiffs,
  printConfig,
  type CommandContext,
  type PersistedCliFiles
} from './cli'
import { commentOnPR } from './comment'
import { listChangedFiles } from './git'
import { parseInputs, type ActionInputs } from './inputs'
import { filterRelevantIssues } from './issues'
import { listMonorepoProjects, type ProjectConfig } from './monorepo'
import { isPullRequest } from './pull-request'

export async function run(
  artifact = new DefaultArtifactClient(),
  git = simpleGit()
): Promise<void> {
  try {
    const inputs = parseInputs()
    let commentMdPath: string | undefined

    if (inputs.monorepo) {
      core.debug('Running Code PushUp in monorepo mode')
      const projects = await listMonorepoProjects(inputs)
      const diffJsonPaths: string[] = []
      for (const project of projects) {
        core.debug(`Running Code PushUp on monorepo project ${project.name}`)
        const comparisonFiles = await runOnProject(
          project,
          inputs,
          artifact,
          git
        )
        if (comparisonFiles) {
          diffJsonPaths.push(comparisonFiles.jsonFilePath)
        }
      }
      if (diffJsonPaths.length > 0) {
        const { mdFilePath, artifactData } = await mergeDiffs(
          diffJsonPaths,
          inputs
        )
        core.debug(`Merged ${diffJsonPaths.length} diffs into ${mdFilePath}`)
        commentMdPath = mdFilePath
        const { size } = await artifact.uploadArtifact(
          createDiffArtifactName(),
          artifactData.files,
          artifactData.rootDir,
          inputs.retention != null
            ? { retentionDays: inputs.retention }
            : undefined
        )
        core.debug(`Uploaded report diff artifact (${size} bytes)`)
      }
    } else {
      core.debug('Running Code PushUp in standalone project mode')
      const comparisonFiles = await runOnProject(null, inputs, artifact, git)
      if (comparisonFiles) {
        commentMdPath = comparisonFiles.mdFilePath
      }
    }

    if (commentMdPath) {
      const commentId = await commentOnPR(commentMdPath, inputs)
      core.setOutput('comment-id', commentId)
      core.debug(`Commented on PR #${github.context.issue.number}`)
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : `${error}`)
  }
}

async function runOnProject(
  project: ProjectConfig | null,
  inputs: ActionInputs,
  artifact: DefaultArtifactClient,
  git: SimpleGit
): Promise<PersistedCliFiles | null> {
  const ctx: CommandContext = {
    project: project?.name,
    bin: project?.bin ?? inputs.bin,
    directory: project?.directory ?? inputs.directory,
    config: inputs.config,
    silent: inputs.silent
  }

  const { jsonFilePath: currReportPath, artifactData: reportArtifact } =
    await collect(ctx)
  const currReport = await fs.readFile(currReportPath, 'utf8')
  core.debug(`Collected current report at ${currReportPath}`)

  if (inputs.artifacts) {
    const { id, size } = await artifact.uploadArtifact(
      createReportArtifactName(project?.name),
      reportArtifact.files,
      reportArtifact.rootDir,
      inputs.retention != null ? { retentionDays: inputs.retention } : undefined
    )
    if (!project) {
      core.setOutput('artifact-id', id)
    }
    core.debug(`Uploaded current report artifact (${size} bytes)`)
  }

  if (!isPullRequest(github.context.payload.pull_request)) {
    return null
  }

  const { base } = github.context.payload.pull_request
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

    try {
      await printConfig(ctx)
      core.debug(
        `Executing print-config verified code-pushup installed in base branch ${base.ref}`
      )
    } catch (err) {
      core.debug(
        `Executing print-config failed, assuming code-pushup not installed in base branch ${base.ref} and skipping comparison - ${err}`
      )
      return null
    }

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

  const comparisonFiles = await compare(
    { before: prevPath, after: currPath, label: project?.name },
    ctx
  )
  core.debug(
    `Compared reports and generated diff at ${comparisonFiles.jsonFilePath} and ${comparisonFiles.mdFilePath}`
  )

  if (inputs.annotations) {
    await git.fetch('origin', base.ref, ['--depth=1'])
    const reportsDiff = await fs.readFile(comparisonFiles.jsonFilePath, 'utf8')
    const changedFiles = await listChangedFiles(
      { base: 'FETCH_HEAD', head: 'HEAD' },
      git
    )
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
      createDiffArtifactName(project?.name),
      comparisonFiles.artifactData.files,
      comparisonFiles.artifactData.rootDir,
      inputs.retention != null ? { retentionDays: inputs.retention } : undefined
    )
    core.debug(`Uploaded report diff artifact (${size} bytes)`)
  }

  return comparisonFiles
}
