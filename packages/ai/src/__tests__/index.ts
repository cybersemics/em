import { AddressInfo } from 'node:net'
import { Server } from 'node:http'

const defineTerm = vi.hoisted(() => vi.fn())
const generateEmoji = vi.hoisted(() => vi.fn())
const generateThought = vi.hoisted(() => vi.fn())
const organizeThought = vi.hoisted(() => vi.fn())

vi.mock('../prompts/defineTerm', () => ({ default: defineTerm }))
vi.mock('../prompts/generateEmoji', () => ({ default: generateEmoji }))
vi.mock('../prompts/generateThought', () => ({ default: generateThought }))
vi.mock('../prompts/organizeThought', () => ({ default: organizeThought }))

import app from '../index'

let server: Server

beforeEach(() => {
  defineTerm.mockReset()
  generateEmoji.mockReset()
  generateThought.mockReset()
  organizeThought.mockReset()
})

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

it('generates multiple thoughts through one service call', async () => {
  const thoughts = ['Potatoes', 'Carrots']
  generateThought.mockResolvedValueOnce(thoughts)
  const { port } = server.address() as AddressInfo
  const inputs = ['[] Grocery list\n  [x] potato\n  [] carrot', '[] Grocery list\n  [] potato\n  [x] carrot']

  const response = await fetch(`http://127.0.0.1:${port}/ai/generateThought`, {
    body: JSON.stringify({ inputs }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  await expect(response.json()).resolves.toEqual({ thoughts })
  expect(generateThought).toHaveBeenCalledOnce()
  expect(generateThought).toHaveBeenCalledWith(inputs)
  expect(response.status).toBe(200)
})

it('generates emoji for multiple values through one service call', async () => {
  const emojis = [
    ['🐕', '🐶', '🦮', '🐾', '🦴', '🐕‍🦺', '🐩', '🐺', '🏠', '🦊'],
    ['📚', '📖', '📘', '📕', '📗', '📙', '📓', '📔', '📒', '🔖'],
  ]
  generateEmoji.mockResolvedValueOnce(emojis)
  const { port } = server.address() as AddressInfo

  const response = await fetch(`http://127.0.0.1:${port}/ai/generateEmoji`, {
    body: JSON.stringify({ values: ['Dog', 'Books'] }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  await expect(response.json()).resolves.toEqual({ emojis })
  expect(generateEmoji).toHaveBeenCalledOnce()
  expect(generateEmoji).toHaveBeenCalledWith(['Dog', 'Books'])
  expect(response.status).toBe(200)
})

it('rejects an empty list of values', async () => {
  const { port } = server.address() as AddressInfo

  const response = await fetch(`http://127.0.0.1:${port}/ai/generateEmoji`, {
    body: JSON.stringify({ values: [] }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  expect(response.status).toBe(400)
  expect(generateEmoji).not.toHaveBeenCalled()
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
