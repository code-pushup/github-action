import type { WebhookPayload } from '@actions/github/lib/interfaces'
import type { components } from '@octokit/openapi-types'

export type PullRequestPayload = NonNullable<WebhookPayload['pull_request']> &
  components['schemas']['pull-request-minimal']

export function isPullRequest(
  payload: WebhookPayload['pull_request']
): payload is PullRequestPayload {
  return payload != null
}
