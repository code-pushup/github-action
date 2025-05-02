import type { ArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { Comment, GitBranch, ProviderAPIClient } from '@code-pushup/ci'
import type { components } from '@octokit/openapi-types'
import path from 'node:path'
import { downloadReportsArtifact, type DownloadedArtifact } from './artifact'
import type { GitHubRefs } from './refs'

export class GitHubApiClient implements ProviderAPIClient {
  readonly maxCommentChars = 65_536

  private readonly octokit

  private readonly artifactCache = new Map<
    string,
    Promise<DownloadedArtifact | null>
  >()

  constructor(
    private readonly token: string,
    private readonly refs: GitHubRefs,
    private readonly artifact: ArtifactClient,
    getOctokit: typeof github.getOctokit
  ) {
    this.octokit = getOctokit(token)
  }

  async createComment(body: string): Promise<Comment> {
    const { data } = await this.octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: github.context.issue.number,
      body
    })
    return this.convertComment(data)
  }

  async updateComment(id: number, body: string): Promise<Comment> {
    const { data } = await this.octokit.rest.issues.updateComment({
      ...github.context.repo,
      comment_id: id,
      body
    })
    return this.convertComment(data)
  }

  async listComments(): Promise<Comment[]> {
    const comments = await this.octokit.paginate(
      this.octokit.rest.issues.listComments,
      {
        ...github.context.repo,
        issue_number: github.context.issue.number
      }
    )
    return comments.map(comment => this.convertComment(comment))
  }

  async downloadReportArtifact(project?: string): Promise<string | null> {
    if (this.refs.base == null) {
      core.debug(`Tried to download artifact without base branch, skipping`)
      return null
    }
    const reports = await this.getReportsArtifact(this.refs.base)

    if (reports == null) {
      return null
    }

    const expectedFile = path.join(
      '.code-pushup',
      '.ci',
      project ?? '',
      '.current',
      'report.json'
    )

    if (!reports.files.includes(expectedFile)) {
      core.warning(`Downloaded artifact doesn't contain ${expectedFile}`)
      return null
    }

    return path.join(reports.downloadPath, expectedFile)
  }

  private async getReportsArtifact(
    base: GitBranch
  ): Promise<DownloadedArtifact | null> {
    const cached = this.artifactCache.get(base.sha)
    if (cached) {
      return cached
    }
    const promise = downloadReportsArtifact(
      this.artifact,
      this.octokit,
      base,
      this.token
    )
    this.artifactCache.set(base.sha, promise)
    return promise
  }

  private convertComment(
    comment: Pick<components['schemas']['issue-comment'], 'id' | 'body' | 'url'>
  ): Comment {
    const { id, body = '', url } = comment
    return { id, body, url }
  }
}
