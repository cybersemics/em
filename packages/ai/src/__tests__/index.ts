import { AddressInfo } from 'node:net'
import { Server } from 'node:http'

const defineTerm = vi.hoisted(() => vi.fn())

vi.mock('../prompts/defineTerm', () => ({ default: defineTerm }))

import app from '../index'
import UpstreamResponseError from '../UpstreamResponseError'

let server: Server

beforeAll(
  () =>
    new Promise<void>(resolve => {
      server = app.listen(0, resolve)
    }),
)

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()))
    }),
)

it('returns a safe gateway error for an invalid upstream response', async () => {
  defineTerm.mockRejectedValueOnce(
    new UpstreamResponseError('The AI could not generate a 10–20 word definition. Please try again.'),
  )
  const { port } = server.address() as AddressInfo

  const response = await fetch(`http://127.0.0.1:${port}/ai/defineTerm`, {
    body: JSON.stringify({ term: 'apple' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  await expect(response.json()).resolves.toEqual({
    error: 'The AI could not generate a 10–20 word definition. Please try again.',
  })
  expect(response.status).toBe(502)
})
