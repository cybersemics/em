import { beforeAll, expect, it } from 'vitest'
import organizeThought from '../prompts/organizeThought'

type OutlineNode = Awaited<ReturnType<typeof organizeThought>>[number]

/** Returns every node in document order. */
const flatten = (nodes: OutlineNode[]): OutlineNode[] => nodes.flatMap(node => [node, ...flatten(node.children)])

/** Returns the chain from a forest root to the node with this id. */
const pathToId = (nodes: OutlineNode[], id: string): OutlineNode[] | null => {
  const found = nodes.find(node => node.id === id)
  if (found) return [found]
  return nodes.reduce<OutlineNode[] | null>((foundPath, node) => {
    if (foundPath) return foundPath
    const nested = pathToId(node.children, id)
    return nested ? [node, ...nested] : null
  }, null)
}

/** Returns true when two ids share a parent node or one is nested under the other. */
const areGrouped = (outline: OutlineNode[], a: string, b: string): boolean => {
  const pathA = pathToId(outline, a)
  const pathB = pathToId(outline, b)
  if (!pathA || !pathB) return false
  if (pathA.some(node => node.id === b) || pathB.some(node => node.id === a)) return true
  const parentA = pathA.at(-2)
  const parentB = pathB.at(-2)
  return !!parentA && parentA === parentB
}

/** Reads prompt ids and their original thought text from the numbered outline. */
const originalTexts = (input: string): Map<string, string> =>
  new Map([...input.matchAll(/\[(\d+)\]\s*(.*)$/gm)].map(match => [match[1], match[2].trim()]))

/** Resolves a node's visible text, falling back to the input thought when text is unchanged. */
const displayText = (node: OutlineNode, originals: Map<string, string>): string =>
  (node.text ?? (node.id ? originals.get(node.id) : '') ?? '').toLowerCase()

/** Formats the outline for assertion messages. */
const dump = (outline: OutlineNode[]): string => JSON.stringify(outline, null, 2)

beforeAll(() => {
  if (!process.env.OPENAI_API_KEY_ORGANIZE_THOUGHT && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_ORGANIZE_THOUGHT or OPENAI_API_KEY is required')
  }
})

it.concurrent('groups related fruits together', async () => {
  const input = `[] picnic
  [1] apples
  [2] bananas
  [3] lemonade
  [4] cookies`
  const outline = await organizeThought(input)

  expect(areGrouped(outline, '1', '2'), dump(outline)).toBe(true)
})

it.concurrent('splits a compound shopping thought into separate items', async () => {
  const input = `[] errands
  [1] Buy milk, eggs, and bread`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)
  const texts = flatten(outline).map(node => displayText(node, originals))

  expect(
    ['milk', 'eggs', 'bread'].every(item => texts.some(text => text.includes(item))),
    dump(outline),
  ).toBe(true)
  expect(
    flatten(outline).some(node => node.id === null),
    dump(outline),
  ).toBe(true)
})

it.concurrent('keeps a nested variety under its parent thought', async () => {
  const input = `[] orchard
  [1] apples
    [2] granny smith
  [3] pears`
  const outline = await organizeThought(input)
  const path = pathToId(outline, '2')

  expect(path?.some(node => node.id === '1'), dump(outline)).toBe(true)
})

it.concurrent('omits context-only thoughts from the reorganized outline', async () => {
  const input = `[] orange juice
[1] apples
[2] bananas`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)
  const texts = flatten(outline).map(node => displayText(node, originals))

  expect(
    texts.some(text => text === 'orange juice'),
    dump(outline),
  ).toBe(false)
})
