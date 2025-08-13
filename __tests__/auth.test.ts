import {
  authenticate,
  GITHUB_AUTH_API_KEY,
  GITHUB_AUTH_SERVICE_URL
} from '../src/auth'
import { jest } from '@jest/globals'

describe('authenticate', () => {
  const mockFetch = jest.spyOn(global, 'fetch')

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should use GitHub App authentication when app is installed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => Promise.resolve({ token: 'ghs_app_123' })
    } as Response)

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'fallback_token'
    )

    expect(result).toBe('ghs_app_123')
    expect(mockFetch).toHaveBeenCalledWith(
      `${GITHUB_AUTH_SERVICE_URL}/github/dunder-mifflin/website/installation-token`,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `Bearer ${GITHUB_AUTH_API_KEY}` }
      })
    )
  })

  it('should fall back to standard authentication when app is not installed', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => Promise.resolve({ error: 'Not installed' })
    } as Response)

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'fallback_token'
    )

    expect(result).toBe('fallback_token')
  })

  it('should fall back to standard authentication when service is unavailable', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'fallback_token'
    )

    expect(result).toBe('fallback_token')
  })
})
