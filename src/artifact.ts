import {
  ArtifactNotFoundError,
  type ArtifactClient,
  type FindOptions
} from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { GitBranch } from '@code-pushup/ci'
import type { RequestError } from '@octokit/request-error'
import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import type { ActionInputs } from './inputs'

export const REPORT_ARTIFACT_NAME = 'code-pushup-report'
const ARTIFACT_DIR = 'tmp'

export async function uploadArtifact(
  artifact: ArtifactClient,
  name: string,
  files: string[],
  inputs: Pick<ActionInputs, 'retention'>
): Promise<number | undefined> {
  const { id, size } = await artifact.uploadArtifact(
    name,
    files,
    process.cwd(),
    inputs.retention != null ? { retentionDays: inputs.retention } : undefined
  )
  core.debug(`Uploaded ${name} artifact (${size} bytes)`)
  return id
}

export async function downloadReportArtifact(
  artifact: ArtifactClient,
  octokit: ReturnType<typeof github.getOctokit>,
  branch: GitBranch,
  token: string,
  project: string | undefined
): Promise<string | null> {
  const {
    data: { workflow_id }
  } = await octokit.rest.actions.getWorkflowRun({
    ...github.context.repo,
    run_id: github.context.runId
  })
  core.debug(
    `Looked up workflow ID ${workflow_id} from workflow run ID ${github.context.runId}`
  )

  const {
    data: { workflow_runs }
  } = await octokit.rest.actions.listWorkflowRuns({
    ...github.context.repo,
    workflow_id,
    branch: branch.ref,
    status: 'completed'
  })
  core.debug(
    `Fetched ${workflow_runs.length} completed workflow runs in ${branch.ref} branch`
  )

  const workflowRun = workflow_runs.find(run => run.head_sha === branch.sha)
  if (!workflowRun) {
    core.info(
      `Workflow run not found for ${branch.ref} branch's commit ${branch.sha}`
    )
    return null
  }
  core.debug(`Found workflow run ${workflowRun.id} for commit ${branch.sha}`)

  try {
    const findBy: FindOptions['findBy'] = {
      workflowRunId: workflowRun.id,
      repositoryOwner: github.context.repo.owner,
      repositoryName: github.context.repo.repo,
      token
    }

    const { artifact: reportArtifact } = await artifact.getArtifact(
      REPORT_ARTIFACT_NAME,
      { findBy }
    )
    core.debug(
      `Found ${reportArtifact.name} artifact with ID ${reportArtifact.id} in workflow run ${workflowRun.id}`
    )

    await rm(ARTIFACT_DIR, { recursive: true, force: true })
    const { downloadPath } = await artifact.downloadArtifact(
      reportArtifact.id,
      { findBy, path: ARTIFACT_DIR }
    )
    if (!downloadPath) {
      throw new Error('Unexpected empty downloadPath')
    }
    const files = await readdir(downloadPath, { recursive: true })
    core.debug(
      `Downloaded artifact to ${downloadPath}, contains files: ${files.join(', ')}`
    )

    const expectedFile = path.join(
      '.code-pushup',
      '.ci',
      project ?? '',
      '.current',
      'report.json'
    )

    if (!files.includes(expectedFile)) {
      core.warning(`Downloaded artifact doesn't contain ${expectedFile}`)
      return null
    }

    return path.join(downloadPath, expectedFile)
  } catch (err) {
    if (err instanceof ArtifactNotFoundError) {
      core.info(
        `Artifact not found for ${branch.ref} branch's commit ${branch.sha} - ${err.message}`
      )
      return null
    }
    if (isRequestError(err)) {
      core.info(
        `Artifact download failed, received "${err.message}" error for ${err.request.method} ${err.request.url} request`
      )
      return null
    }
    if (err instanceof Error || typeof err === 'string') {
      core.error(err)
    }
    throw err
  }
}

// `err instanceof RequestError` is `false` for some reason
function isRequestError(err: unknown): err is RequestError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof err.status === 'number'
  )
}
