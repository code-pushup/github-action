import * as core from '@actions/core'
import type { Context } from '@actions/github/lib/context'

type TokenResponse = {
  token: string
}

type AuthService = {
  url: string
  key: string
  name: string
}

export const STAGING_SERVICE: AuthService = {
  url: 'https://github-auth.staging.code-pushup.dev',
  key: '18850f2513adad10662e85f4f085a9714e64cef7793fc2ffe903b5ddcd62de42',
  name: 'Code PushUp (staging)'
}

export const PRODUCTION_SERVICE: AuthService = {
  url: 'https://github-auth.code-pushup.dev',
  key: 'b2585352366ceead1323a1f3a7cf6b9212387ea6d2d8aeb397e7950aaa3ba776',
  name: 'Code PushUp'
}

export async function authenticate(
  { owner, repo }: Context['repo'],
  token: string
): Promise<string> {
  if (token !== process.env.GITHUB_TOKEN) {
    core.info('Using user-provided PAT')
    return token
  }
  const productionResult = await tryService(PRODUCTION_SERVICE, owner, repo)
  if (productionResult) {
    core.info(`Using ${PRODUCTION_SERVICE.name} GitHub App installation token`)
    return productionResult.token
  }
  const stagingResult = await tryService(STAGING_SERVICE, owner, repo)
  if (stagingResult) {
    core.info(`Using ${STAGING_SERVICE.name} GitHub App installation token`)
    return stagingResult.token
  }
  core.info('Using default GITHUB_TOKEN')
  return token
}

async function tryService(
  service: AuthService,
  owner: string,
  repo: string
): Promise<{ token: string; service: AuthService } | null> {
  try {
    const response = await fetch(
      `${service.url}/github/${owner}/${repo}/installation-token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${service.key}`
        }
      }
    )
    const data = await response.json()
    if (response.ok && isTokenResponse(data)) {
      return { token: data.token, service }
    }
    handleErrorResponse(response.status, service.name)
  } catch (error) {
    core.debug(
      `Unable to contact ${service.name} authentication service: ${error}`
    )
    return null
  }
  return null
}

function isTokenResponse(res: unknown): res is TokenResponse {
  return (
    !!res &&
    typeof res === 'object' &&
    'token' in res &&
    typeof res.token === 'string'
  )
}

function handleErrorResponse(status: number, serviceName: string): void {
  switch (status) {
    case 404:
      core.debug(`${serviceName} GitHub App not installed on this repository`)
      break
    case 401:
      core.warning(`${serviceName} authentication service authorization failed`)
      break
    case 500:
      core.warning(
        `${serviceName} authentication service temporarily unavailable`
      )
      break
    default:
      core.warning(
        `${serviceName} authentication service returned unexpected status: ${status}`
      )
  }
}
