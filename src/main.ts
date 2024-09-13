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
  createCommandContext,
  mergeDiffs,
  printConfig,
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
      core.info('Running Code PushUp in monorepo mode')
      const projects = await listMonorepoProjects(inputs)
      const diffJsonPaths: string[] = []
      for (const project of projects) {
        core.info(`Running Code PushUp on monorepo project ${project.name}`)
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
          createCommandContext(inputs, projects[0])
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
      core.info('Running Code PushUp in standalone project mode')
      const comparisonFiles = await runOnProject(null, inputs, artifact, git)
      if (comparisonFiles) {
        commentMdPath = comparisonFiles.mdFilePath
      }
    }

    if (commentMdPath) {
      const commentId = await commentOnPR(commentMdPath, inputs)
      core.setOutput('comment-id', commentId)
      core.info(`Commented on PR #${github.context.issue.number}`)
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
  const ctx = createCommandContext(inputs, project)

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
  core.info(`PR detected, preparing to compare base branch ${base.ref}`)

  let prevReport: string

  let cachedBaseReport: PersistedCliFiles | null = null
  if (inputs.artifacts) {
    cachedBaseReport = await downloadReportArtifact(artifact, base, inputs)
    core.info(
      `Previous report artifact ${cachedBaseReport ? 'found' : 'not found'}`
    )
    if (cachedBaseReport) {
      core.debug(
        `Previous report artifact downloaded to ${cachedBaseReport.jsonFilePath}`
      )
    }
  }

  if (cachedBaseReport) {
    prevReport = await fs.readFile(cachedBaseReport.jsonFilePath, 'utf8')
  } else {
    await git.fetch('origin', base.ref, ['--depth=1'])
    await git.checkout(['-f', base.ref])
    core.info(`Switched to base branch ${base.ref}`)

    try {
      await printConfig({ ...ctx, silent: !core.isDebug() })
      core.debug(
        `Executing print-config verified code-pushup installed in base branch ${base.ref}`
      )
    } catch (err) {
      core.debug(`Error from print-config - ${err}`)
      core.info(
        `Executing print-config failed, assuming code-pushup not installed in base branch ${base.ref} and skipping comparison`
      )
      return null
    }

    const { jsonFilePath: prevReportPath } = await collect(ctx)
    prevReport = await fs.readFile(prevReportPath, 'utf8')
    core.debug(`Collected previous report at ${prevReportPath}`)

    await git.checkout(['-f', '-'])
    core.info('Switched back to PR branch')
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
  core.info('Compared reports and generated diff files')
  core.debug(
    `Generated diff files at ${comparisonFiles.jsonFilePath} and ${comparisonFiles.mdFilePath}`
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
