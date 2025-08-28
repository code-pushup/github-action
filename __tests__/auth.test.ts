import { authenticate, PRODUCTION_SERVICE, STAGING_SERVICE } from '../src/auth'
import { jest } from '@jest/globals'

describe('authenticate', () => {
  const mockFetch = jest.spyOn(global, 'fetch')

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_default_token'
    mockFetch.mockClear()
  })

  it('should use production GitHub App when installed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => Promise.resolve({ token: 'ghs_prod_token' })
    } as Response)

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'ghp_default_token'
    )

    expect(result).toBe('ghs_prod_token')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      `${PRODUCTION_SERVICE.url}/github/dunder-mifflin/website/installation-token`,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `Bearer ${PRODUCTION_SERVICE.key}` }
      })
    )
  })

  it('should use staging GitHub App when production not installed', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not installed' })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: 'ghs_staging_token' })
      } as Response)

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'ghp_default_token'
    )

    expect(result).toBe('ghs_staging_token')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenCalledWith(
      `${STAGING_SERVICE.url}/github/dunder-mifflin/website/installation-token`,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `Bearer ${STAGING_SERVICE.key}` }
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
      'ghp_default_token'
    )

    expect(result).toBe('ghp_default_token')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should fall back to standard authentication when service is unavailable', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'ghp_default_token'
    )

    expect(result).toBe('ghp_default_token')
  })

  it('should use user-provided PAT when different from GITHUB_TOKEN', async () => {
    const customPAT = 'ghp_custom_pat'

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      customPAT
    )

    expect(result).toBe(customPAT)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle all services returning errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      } as Response)

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'ghp_default_token'
    )

    expect(result).toBe('ghp_default_token')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should handle unexpected status codes', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' })
      } as Response)

    const result = await authenticate(
      { owner: 'dunder-mifflin', repo: 'website' },
      'ghp_default_token'
    )

    expect(result).toBe('ghp_default_token')
  })
})
