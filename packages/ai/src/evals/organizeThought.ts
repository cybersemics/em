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

/** Returns the parent node of this id in the outline forest, or undefined if the node is a root. */
const parentOf = (nodes: OutlineNode[], id: string): OutlineNode | undefined => pathToId(nodes, id)?.at(-2)

/** Returns the prompt id of the parent node, or undefined if the node is a root. */
const parentIdOf = (nodes: OutlineNode[], id: string): string | null | undefined => parentOf(nodes, id)?.id

/** Returns true when the text looks like a catch-all leftover category. */
const isLeftoverBucket = (text: string): boolean => /\b(other|misc|uncategor)/.test(text)

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

it.concurrent('moves misplaced items into existing matching categories instead of a leftover bucket', async () => {
  const input = `[1] Alphabetized states
  [2] oregon
  [3] banana
  [4] maine
[5] Alphabetized fruits
  [6] pear
  [7] ohio
  [8] cherry`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)
  const texts = flatten(outline).map(node => displayText(node, originals))

  expect(outline.map(node => node.id).sort(), dump(outline)).toEqual(['1', '5'])
  expect(parentIdOf(outline, '2'), dump(outline)).toBe('1')
  expect(parentIdOf(outline, '3'), dump(outline)).toBe('5')
  expect(parentIdOf(outline, '4'), dump(outline)).toBe('1')
  expect(parentIdOf(outline, '6'), dump(outline)).toBe('5')
  expect(parentIdOf(outline, '7'), dump(outline)).toBe('1')
  expect(parentIdOf(outline, '8'), dump(outline)).toBe('5')
  expect(
    texts.some(isLeftoverBucket),
    dump(outline),
  ).toBe(false)
})

it.concurrent(
  'reclassifies a mixed alphabetized states and fruits outline and keeps nested cities',
  async () => {
    const input = `[] Places
  [1] Alphabetized states
    [2] Vermont
    [3] kiwi
    [4] Georgia
      [5] Atlanta
    [6] mango
    [7] Utah
  [8] Alphabetized fruits
    [9] fig
    [10] Kansas
    [11] date
    [12] Nevada
      [13] Las Vegas
    [14] plum
    [15] Delaware`
    const originals = originalTexts(input)
    const outline = await organizeThought(input)
    const states = outline.find(node => node.id === '1')
    const fruits = outline.find(node => node.id === '8')
    const georgia = pathToId(outline, '4')?.at(-1)
    const nevada = pathToId(outline, '12')?.at(-1)

    expect(outline.map(node => node.id).sort(), dump(outline)).toEqual(['1', '8'])
    expect(
      flatten(outline)
        .map(node => displayText(node, originals))
        .some(isLeftoverBucket),
      dump(outline),
    ).toBe(false)

    expect(parentIdOf(outline, '2'), dump(outline)).toBe('1')
    expect(parentIdOf(outline, '4'), dump(outline)).toBe('1')
    expect(parentIdOf(outline, '7'), dump(outline)).toBe('1')
    expect(parentIdOf(outline, '10'), dump(outline)).toBe('1')
    expect(parentIdOf(outline, '12'), dump(outline)).toBe('1')
    expect(parentIdOf(outline, '15'), dump(outline)).toBe('1')
    expect(parentIdOf(outline, '3'), dump(outline)).toBe('8')
    expect(parentIdOf(outline, '6'), dump(outline)).toBe('8')
    expect(parentIdOf(outline, '9'), dump(outline)).toBe('8')
    expect(parentIdOf(outline, '11'), dump(outline)).toBe('8')
    expect(parentIdOf(outline, '14'), dump(outline)).toBe('8')
    expect(parentIdOf(outline, '5'), dump(outline)).toBe('4')
    expect(parentIdOf(outline, '13'), dump(outline)).toBe('12')

    expect(states?.children.map(child => child.id), dump(outline)).toEqual(
      expect.arrayContaining(['2', '4', '7', '10', '12', '15']),
    )
    expect(states?.children, dump(outline)).toHaveLength(6)
    expect(
      fruits?.children.map(child => child.id),
      dump(outline),
    ).toEqual(['11', '9', '3', '6', '14'])
    expect(
      georgia?.children.map(child => child.id),
      dump(outline),
    ).toEqual(['5'])
    expect(
      nevada?.children.map(child => child.id),
      dump(outline),
    ).toEqual(['13'])
  },
)

it.concurrent('splits a compound thought without duplicating an item that already exists', async () => {
  const input = `[] pantry
  [1] rice
  [2] beans
  [3] Pick up rice, lentils, and oats`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)
  const nodes = flatten(outline)
  const riceNodes = nodes.filter(node => displayText(node, originals).includes('rice'))
  const lentilNode = nodes.find(node => displayText(node, originals).includes('lentil'))
  const oatNode = nodes.find(node => displayText(node, originals).includes('oat'))

  expect(riceNodes, dump(outline)).toHaveLength(1)
  expect(lentilNode, dump(outline)).toBeDefined()
  expect(oatNode, dump(outline)).toBeDefined()
  expect(lentilNode, dump(outline)).not.toBe(riceNodes[0])
  expect(oatNode, dump(outline)).not.toBe(riceNodes[0])
  expect(lentilNode, dump(outline)).not.toBe(oatNode)
})

it.concurrent('creates dairy, fruit, and vegetable groups from a mixed grocery list', async () => {
  const input = `[] Grocery List
  [1] yogurt
  [2] peach
  [3] broccoli
  [4] butter
  [5] blueberry
  [6] onion`
  const outline = await organizeThought(input)
  const yogurtParent = parentOf(outline, '1')
  const peachParent = parentOf(outline, '2')
  const broccoliParent = parentOf(outline, '3')

  expect(yogurtParent, dump(outline)).toBeDefined()
  expect(peachParent, dump(outline)).toBeDefined()
  expect(broccoliParent, dump(outline)).toBeDefined()
  expect(parentOf(outline, '4'), dump(outline)).toBe(yogurtParent)
  expect(parentOf(outline, '5'), dump(outline)).toBe(peachParent)
  expect(parentOf(outline, '6'), dump(outline)).toBe(broccoliParent)
  expect(yogurtParent, dump(outline)).not.toBe(peachParent)
  expect(yogurtParent, dump(outline)).not.toBe(broccoliParent)
  expect(peachParent, dump(outline)).not.toBe(broccoliParent)
})

it.concurrent('keeps a nested variety under its fruit when nearby items are reorganized', async () => {
  const input = `[] garage sale finds
  [1] peaches
    [2] donut peach
  [3] wrench
  [4] nectarines`
  const outline = await organizeThought(input)

  expect(parentIdOf(outline, '2'), dump(outline)).toBe('1')
  expect(parentIdOf(outline, '3'), dump(outline)).not.toBe('1')
  expect(parentIdOf(outline, '4'), dump(outline)).not.toBe('3')
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
