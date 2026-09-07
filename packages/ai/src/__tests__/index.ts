import { AddressInfo } from 'node:net'
import { Server } from 'node:http'

const defineTerm = vi.hoisted(() => vi.fn())
const generateEmoji = vi.hoisted(() => vi.fn())
const generateThought = vi.hoisted(() => vi.fn())

vi.mock('../prompts/defineTerm', () => ({ default: defineTerm }))
vi.mock('../prompts/generateEmoji', () => ({ default: generateEmoji }))
vi.mock('../prompts/generateThought', () => ({ default: generateThought }))

import app from '../index'

let server: Server

beforeEach(() => {
  defineTerm.mockReset()
  generateEmoji.mockReset()
  generateThought.mockReset()
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
