import { AddressInfo } from 'node:net'
import { Server } from 'node:http'

const defineTerm = vi.hoisted(() => vi.fn())

vi.mock('../prompts/defineTerm', () => ({ default: defineTerm }))

import app from '../index'

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

it('defines multiple terms through one service call', async () => {
  const definitions = [
    'A domesticated bird raised worldwide for eggs, meat, feathers, and companionship.',
    'A round, edible fruit with crisp flesh that grows on trees.',
  ]
  defineTerm.mockResolvedValueOnce(definitions)
  const { port } = server.address() as AddressInfo

  const response = await fetch(`http://127.0.0.1:${port}/ai/defineTerm`, {
    body: JSON.stringify({ terms: ['chicken', 'apple'] }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  await expect(response.json()).resolves.toEqual({ definitions })
  expect(defineTerm).toHaveBeenCalledOnce()
  expect(defineTerm).toHaveBeenCalledWith(['chicken', 'apple'])
  expect(response.status).toBe(200)
})
