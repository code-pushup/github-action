import { type ArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { ActionInputs } from './inputs'
import { type PersistedCliFiles } from './persist'

export const REPORT_ARTIFACT_NAME = 'code-pushup-report'
export const DIFF_ARTIFACT_NAME = 'code-pushup-report-diff'

// const ARTIFACT_DIR = 'tmp'

export async function downloadReportArtifact(
  artifact: ArtifactClient,
  branch: { ref: string; sha: string },
  { token }: ActionInputs
): Promise<PersistedCliFiles | null> {
  const octokit = github.getOctokit(token)

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

  return null
  // try {
  //   const findBy: FindOptions['findBy'] = {
  //     workflowRunId: workflowRun.id,
  //     repositoryOwner: github.context.repo.owner,
  //     repositoryName: github.context.repo.repo,
  //     token
  //   }

  //   const { artifact: reportArtifact } = await artifact.getArtifact(
  //     REPORT_ARTIFACT_NAME,
  //     { findBy }
  //   )
  //   core.debug(
  //     `Found ${reportArtifact.name} artifact with ID ${reportArtifact.id} in workflow run ${workflowRun.id}`
  //   )

  //   await fs.rm(ARTIFACT_DIR, { recursive: true, force: true })
  //   const { downloadPath } = await artifact.downloadArtifact(
  //     reportArtifact.id,
  //     { findBy, path: ARTIFACT_DIR }
  //   )
  //   if (!downloadPath) {
  //     throw new Error('Unexpected empty downloadPath')
  //   }
  //   console.log(ARTIFACT_DIR)
  //   const files = await fs.readdir(downloadPath)
  //   console.log(files)
  //   core.debug(
  //     `Downloaded artifact to ${downloadPath}, contains files: ${files.join(', ')}`
  //   )

  //   return findPersistedFiles(downloadPath, files)
  // } catch (err) {
  //   if (err instanceof ArtifactNotFoundError) {
  //     core.info(
  //       `Artifact not found for ${branch.ref} branch's commit ${branch.sha}`
  //     )
  //     return null
  //   }
  //   if (err instanceof Error || typeof err === 'string') {
  //     core.error(err)
  //   }
  //   throw err
  // }
}
