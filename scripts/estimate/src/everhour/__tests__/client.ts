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

  describe('findTaskByIssueNumber', () => {
    it('resolves the real Everhour task ID from the issue number', async () => {
      // Everhour encodes GitHub-linked tasks as gh:<issue_database_id>; the issue number lives in the
      // `number` field, so the task ID cannot be derived from the issue number and must be looked up.
      const tasks = [
        { id: 'gh:498948741', name: 'Some issue', number: '76' },
        { id: 'gh:143808059:100', name: 'Another issue' },
      ]
      const fetchMock = vi.fn(async () => new Response(JSON.stringify(tasks), { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      const client = new EverhourClient({ apiKey: 'test-key' })
      const task = await client.findTaskByIssueNumber('proj-1', 76)

      expect(task?.id).toBe('gh:498948741')
      vi.unstubAllGlobals()
    })

    it('pages through tasks until a match is found', async () => {
      const fullPage = Array.from({ length: 250 }, (_, i) => ({ id: `t${i}`, name: `Task ${i}` }))
      const secondPage = [{ id: 'gh:143808059:42', name: 'Target' }]
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(fullPage), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(secondPage), { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      const client = new EverhourClient({ apiKey: 'test-key' })
      const task = await client.findTaskByIssueNumber('proj-1', 42)

      expect(task?.id).toBe('gh:143808059:42')
      expect(fetchMock).toHaveBeenCalledTimes(2)
      vi.unstubAllGlobals()
    })

    it('returns null when no task matches the issue number', async () => {
      const tasks = [{ id: 'gh:498948741', name: 'Some issue', number: '76' }]
      const fetchMock = vi.fn(async () => new Response(JSON.stringify(tasks), { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)

      const client = new EverhourClient({ apiKey: 'test-key' })
      const task = await client.findTaskByIssueNumber('proj-1', 999)

      expect(task).toBeNull()
      vi.unstubAllGlobals()
    })
  })
})
