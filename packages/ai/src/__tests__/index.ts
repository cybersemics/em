import { AddressInfo } from 'node:net'
import { Server } from 'node:http'

const defineTerm = vi.hoisted(() => vi.fn())
const organizeThought = vi.hoisted(() => vi.fn())

vi.mock('../prompts/defineTerm', () => ({ default: defineTerm }))
vi.mock('../prompts/organizeThought', () => ({ default: organizeThought }))

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

it('reorganizes thoughts through one service call', async () => {
  const finalOutline = `[new] Fruit
  [1] apples
    [2] granny smith
  [3] bananas`
  const outline = [
    {
      id: null,
      text: 'Fruit',
      children: [
        { id: '1', text: 'apples', children: [{ id: '2', text: 'granny smith', children: [] }] },
        { id: '3', text: 'bananas', children: [] },
      ],
    },
  ]
  organizeThought.mockResolvedValueOnce(finalOutline)
  const { port } = server.address() as AddressInfo

  const response = await fetch(`http://127.0.0.1:${port}/ai/organizeThought`, {
    body: JSON.stringify({ outline: '[1] apples\n  [2] granny smith\n[3] bananas' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  await expect(response.json()).resolves.toEqual({ outline })
  expect(organizeThought).toHaveBeenCalledOnce()
  expect(organizeThought).toHaveBeenCalledWith('[1] apples\n  [2] granny smith\n[3] bananas')
  expect(response.status).toBe(200)
})

it.each([
  ['omits an input id', '[1] apples'],
  ['invents an id', '[1] apples\n[2] bananas\n[99] oranges'],
  ['duplicates an id', '[1] apples\n[1] apples\n[2] bananas'],
  ['includes a context marker', '[] context\n[1] apples\n[2] bananas'],
  ['uses invalid indentation', '[1] apples\n   [2] bananas'],
  ['creates a thought without text', '[1] apples\n[2] bananas\n[new]'],
])('rejects an organized outline that %s', async (_, finalOutline) => {
  organizeThought.mockResolvedValueOnce(finalOutline)
  const { port } = server.address() as AddressInfo

  const response = await fetch(`http://127.0.0.1:${port}/ai/organizeThought`, {
    body: JSON.stringify({ outline: '[1] apples\n[2] bananas' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  await expect(response.json()).resolves.toEqual({ error: 'Internal server error' })
  expect(response.status).toBe(500)
})
