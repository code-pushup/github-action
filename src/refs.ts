import * as github from '@actions/github'
import type { WebhookPayload } from '@actions/github/lib/interfaces'
import type { GitBranch } from '@code-pushup/ci'
import type { components } from '@octokit/openapi-types'

export type GitHubRefs = {
  head: GitBranch
  base?: GitBranch
}

export function parseGitRefs(): GitHubRefs {
  if (isPullRequest(github.context.payload.pull_request)) {
    const { head, base } = github.context.payload.pull_request
    return { head: parseBranchRef(head), base: parseBranchRef(base) }
  }
  return { head: parseBranchRef(github.context) }
}

function parseBranchRef({ ref, sha }: GitBranch): GitBranch {
  return {
    // full-formed ref (e.g. refs/heads/main) to short ref (e.g. main)
    ref: ref.split('/').at(-1) ?? ref,
    sha
  }
}

type PullRequestPayload = NonNullable<WebhookPayload['pull_request']> &
  components['schemas']['pull-request-minimal']

function isPullRequest(
  payload: WebhookPayload['pull_request']
): payload is PullRequestPayload {
  return payload != null
}
