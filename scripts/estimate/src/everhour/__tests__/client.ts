import { afterEach, describe, expect, it, vi } from 'vitest'
import EverhourClient from '../client.ts'

describe('EverhourClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('setEstimate sends the overall type discriminator required by the Everhour API', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const client = new EverhourClient({ apiKey: 'test-key' })
    await client.setEstimate('123', 7200)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.everhour.com/tasks/123/estimate')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string)).toEqual({ type: 'overall', total: 7200 })

    vi.unstubAllGlobals()
  })
})
