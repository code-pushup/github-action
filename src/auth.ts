import * as core from '@actions/core'
import type { Context } from '@actions/github/lib/context'

export const GITHUB_AUTH_SERVICE_URL =
  'https://github-auth.staging.code-pushup.dev'

export const GITHUB_AUTH_API_KEY =
  '18850f2513adad10662e85f4f085a9714e64cef7793fc2ffe903b5ddcd62de42'

type TokenResponse = {
  token: string
}

export async function authenticate(
  { owner, repo }: Context['repo'],
  fallbackToken: string
): Promise<string> {
  try {
    const response = await fetch(
      `${GITHUB_AUTH_SERVICE_URL}/github/${owner}/${repo}/installation-token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_AUTH_API_KEY}`
        }
      }
    )
    const data = await response.json()
    if (response.ok && isTokenResponse(data)) {
      core.info('Using Code PushUp GitHub App authentication')
      return data.token
    }
    handleErrorResponse(response.status)
  } catch (error) {
    core.warning(
      `Unable to contact Code PushUp authentication service: ${error}`
    )
  }
  core.info('Using standard token authentication')
  return fallbackToken
}

function isTokenResponse(res: unknown): res is TokenResponse {
  return (
    !!res &&
    typeof res === 'object' &&
    'token' in res &&
    typeof res.token === 'string'
  )
}

function handleErrorResponse(status: number): void {
  switch (status) {
    case 404:
      core.debug('Code PushUp GitHub App not installed on this repository')
      break
    case 401:
      core.warning('Code PushUp authentication service authorization failed')
      break
    case 500:
      core.warning('Code PushUp authentication service temporarily unavailable')
      break
    default:
      core.debug(`Code PushUp authentication service returned status ${status}`)
  }
}
