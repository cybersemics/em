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

it.concurrent('creates separate semantic groups for fruit and tools', async () => {
  const input = `[] things to put away
  [1] apples
  [2] hammer
  [3] bananas
  [4] screwdriver`
  const outline = await organizeThought(input)
  const applePath = pathToId(outline, '1')
  const hammerPath = pathToId(outline, '2')
  const bananaPath = pathToId(outline, '3')
  const screwdriverPath = pathToId(outline, '4')
  const fruitParent = applePath?.at(-2)
  const toolParent = hammerPath?.at(-2)

  expect(fruitParent, dump(outline)).toBeDefined()
  expect(toolParent, dump(outline)).toBeDefined()
  expect(bananaPath?.at(-2), dump(outline)).toBe(fruitParent)
  expect(screwdriverPath?.at(-2), dump(outline)).toBe(toolParent)
  expect(toolParent, dump(outline)).not.toBe(fruitParent)
})

it.concurrent('splits a compound shopping thought into separate items', async () => {
  const input = `[] errands
  [1] Buy milk, eggs, and bread`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)
  const nodes = flatten(outline)
  const items = ['milk', 'eggs', 'bread']
  const itemNodes = items.map(item => nodes.find(node => displayText(node, originals).includes(item)))

  expect(itemNodes.every(Boolean), dump(outline)).toBe(true)
  expect(new Set(itemNodes).size, dump(outline)).toBe(items.length)
  expect(
    itemNodes.every(node => items.filter(item => displayText(node!, originals).includes(item)).length === 1),
    dump(outline),
  ).toBe(true)
  expect(nodes.filter(node => node.id === null).length, dump(outline)).toBeGreaterThanOrEqual(2)
})

it.concurrent('keeps a specific programming language under its category', async () => {
  const input = `[] learning plan
  [1] Programming languages
    [2] TypeScript
  [3] Vegetable gardening`
  const outline = await organizeThought(input)
  const path = pathToId(outline, '2')

  expect(path?.some(node => node.id === '1'), dump(outline)).toBe(true)
})

it.concurrent('does not copy a context-only marker into any output thought', async () => {
  const input = `[] ZXQ-CONTEXT-ONLY-9173
[1] apples
[2] hammer
[3] bananas
[4] screwdriver`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)
  const texts = flatten(outline).map(node => displayText(node, originals))

  expect(
    texts.some(text => text.includes('zxq-context-only-9173')),
    dump(outline),
  ).toBe(false)
})
