import type { ArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { Comment, GitRefs, ProviderAPIClient } from '@code-pushup/ci'
import type { components } from '@octokit/openapi-types'
import { downloadReportArtifact } from './artifact'

export class GitHubApiClient implements ProviderAPIClient {
  readonly maxCommentChars = 65_536

  private readonly octokit

  constructor(
    private readonly token: string,
    private readonly refs: GitRefs,
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
    return downloadReportArtifact(
      this.artifact,
      this.octokit,
      this.refs.base,
      this.token,
      project
    )
  }

  private convertComment(
    comment: Pick<components['schemas']['issue-comment'], 'id' | 'body' | 'url'>
  ): Comment {
    const { id, body = '', url } = comment
    return { id, body, url }
  }
}
