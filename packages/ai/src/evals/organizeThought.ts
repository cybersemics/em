import { beforeAll, expect, it } from 'vitest'
import organizeThought from '../prompts/organizeThought'

type OutlineNode = Awaited<ReturnType<typeof organizeThought>>[number]

/** A node in an expected outline. `id` is an existing prompt id, null for a new thought, or undefined for any id. */
interface ExpectedNode {
  id: string | null | undefined
  text: string | null
  children: ExpectedNode[]
}

/** Options that control how strictly an expected outline is compared to the model output. */
interface ExpectOutlineOptions {
  /** When true, expected roots may match actual nodes anywhere in the tree, not only forest roots. */
  anywhere?: boolean
  /** When true, actual siblings may include nodes not listed in expected. */
  extra?: boolean
  /** Minimum number of new (id-null) thoughts required in the actual outline. */
  minNew?: number
  /** When true, sibling order must match the expected outline. */
  ordered?: boolean
}

/** Returns every node in document order. */
const flatten = (nodes: OutlineNode[]): OutlineNode[] => nodes.flatMap(node => [node, ...flatten(node.children)])

/** Returns true when the text looks like a catch-all leftover category. */
const isLeftoverBucket = (text: string): boolean => /\b(other|misc|uncategor)/.test(text.toLowerCase())

/** Reads prompt ids and their original thought text from the numbered outline. */
const originalTexts = (input: string): Map<string, string> =>
  new Map([...input.matchAll(/\[(\d+)\]\s*(.*)$/gm)].map(match => [match[1], match[2].trim()]))

/** Resolves a node's visible text, falling back to the input thought when text is unchanged. */
const nodeText = (node: OutlineNode, originals: Map<string, string>): string =>
  node.text ?? (node.id ? originals.get(node.id) : '') ?? ''

/** Returns true when actual text satisfies an optional expected snippet. */
const textMatches = (actual: string, expected: string | null): boolean =>
  !expected || actual.toLowerCase().includes(expected.toLowerCase())

/** Renders an outline forest as an indented [id] text tree. */
const formatOutline = (nodes: OutlineNode[], originals: Map<string, string>, indent = 0): string =>
  nodes
    .map(node => {
      const text = nodeText(node, originals)
      const line = `${'  '.repeat(indent)}[${node.id ?? 'new'}]${text ? ` ${text}` : ''}`
      const nested = formatOutline(node.children, originals, indent + 1)
      return nested ? `${line}\n${nested}` : line
    })
    .join('\n')

/** Parses one expected-outline line into a node with no children. */
const parseExpectedLine = (line: string): ExpectedNode => {
  const newMatch = line.match(/^\[new\]\s*(.*)$/i)
  if (newMatch) return { children: [], id: null, text: newMatch[1].trim() || null }

  const anyIdMatch = line.match(/^\[\?\]\s*(.*)$/)
  if (anyIdMatch) return { children: [], id: undefined, text: anyIdMatch[1].trim() || null }

  const wildcardMatch = line.match(/^\?(?:\s+(.*))?$/)
  if (wildcardMatch) return { children: [], id: null, text: wildcardMatch[1]?.trim() || null }

  const idMatch = line.match(/^\[(\d+)\](?:\s+(.*))?$/)
  if (!idMatch) throw new Error(`Invalid expected outline line: ${line}`)
  return { children: [], id: idMatch[1], text: idMatch[2]?.trim() ?? null }
}

/** Parses an indented expected outline into a tree. */
const parseExpected = (expected: string): ExpectedNode[] => {
  const lines = expected.split('\n').filter(line => line.trim())
  return lines.reduce<{ roots: ExpectedNode[]; stack: { indent: number; node: ExpectedNode }[] }>(
    (accum, line) => {
      const indent = (line.match(/^ */)?.[0].length ?? 0) / 2
      const node = parseExpectedLine(line.trim())
      const parentStack = accum.stack.filter(entry => entry.indent < indent)
      const parent = parentStack.at(-1)
      if (parent) parent.node.children.push(node)
      return {
        roots: parent ? accum.roots : [...accum.roots, node],
        stack: [...parentStack, { indent, node }],
      }
    },
    { roots: [], stack: [] },
  ).roots
}

/** Returns true when an actual node satisfies an expected node, including descendants. */
const matchNode = (
  actual: OutlineNode,
  expected: ExpectedNode,
  originals: Map<string, string>,
  options: { extra: boolean; ordered: boolean },
): boolean => {
  const actualText = nodeText(actual, originals)
  const idMatches =
    expected.id === undefined
      ? true
      : expected.id === null
        ? actual.id === null && !isLeftoverBucket(actualText)
        : actual.id === expected.id
  return (
    idMatches &&
    textMatches(actualText, expected.text) &&
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    matchForest(actual.children, expected.children, originals, options)
  )
}

/** Returns true when expected siblings can be matched against actual siblings. */
const matchForest = (
  actual: OutlineNode[],
  expected: ExpectedNode[],
  originals: Map<string, string>,
  options: { extra: boolean; ordered: boolean },
): boolean => {
  if (expected.length > actual.length) return false
  if (!options.extra && actual.length !== expected.length) return false

  if (options.ordered) {
    return expected.every((node, index) => matchNode(actual[index], node, originals, options))
  }

  /** Returns true when remaining expected siblings can be matched against unused actual siblings. */
  const matchFrom = (expectedIndex: number, used: number[]): boolean =>
    expectedIndex === expected.length
      ? true
      : actual.some(
          (node, index) =>
            !used.includes(index) &&
            matchNode(node, expected[expectedIndex], originals, options) &&
            matchFrom(expectedIndex + 1, [...used, index]),
        )

  return matchFrom(0, [])
}

/** Asserts that the model outline matches the expected indented final state.
 *
 * Expected lines use the same `[n] text` markers as the prompt. `?` is a new thought with any non-leftover label,
 * `[new] text` is a new thought with matching text, and `[?] text` is any existing or new thought whose text includes
 * the snippet. Sibling order is ignored unless `ordered` is set.
 */
const expectOutline = (
  outline: OutlineNode[],
  originals: Map<string, string>,
  expected: string,
  { anywhere = false, extra = false, minNew = 0, ordered = false }: ExpectOutlineOptions = {},
) => {
  const actualNodes = anywhere ? flatten(outline) : outline
  const matched = matchForest(actualNodes, parseExpected(expected), originals, { extra, ordered })
  const newCount = flatten(outline).filter(node => node.id === null).length
  const message = `Actual:\n${formatOutline(outline, originals)}\n\nExpected:\n${expected.trim()}`
  expect(matched && newCount >= minNew, message).toBe(true)
}

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

  expectOutline(
    outline,
    originalTexts(input),
    `
?
  [1] apples
  [3] bananas
?
  [2] hammer
  [4] screwdriver
`,
  )
})

it.concurrent('splits a compound shopping thought into separate items', async () => {
  const input = `[] errands
  [1] Buy milk, eggs, and bread`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)

  expectOutline(
    outline,
    originals,
    `
[?] milk
[?] eggs
[?] bread
`,
    { anywhere: true, extra: true, minNew: 2 },
  )
})

it.concurrent('keeps a specific programming language under its category', async () => {
  const input = `[] learning plan
  [1] Programming languages
    [2] TypeScript
  [3] Vegetable gardening`
  const outline = await organizeThought(input)

  expectOutline(
    outline,
    originalTexts(input),
    `
[1] Programming languages
  [2] TypeScript
`,
    { anywhere: true, extra: true },
  )
})

it.concurrent('moves misplaced items into existing matching categories instead of a leftover bucket', async () => {
  const input = `[1] Alphabetized states
  [2] Oregon
  [3] banana
  [4] Maine
[5] Alphabetized fruits
  [6] pear
  [7] Ohio
  [8] cherry`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)

  expectOutline(
    outline,
    originals,
    `
[1] Alphabetized states
  [4] Maine
  [7] Ohio
  [2] Oregon
[5] Alphabetized fruits
  [3] banana
  [8] cherry
  [6] pear
`,
  )
})

it.concurrent('reclassifies a mixed alphabetized states and fruits outline and keeps nested cities', async () => {
  const input = `[] Places
  [1] Alphabetized states
    [2] Oregon
    [3] Banana
    [4] Georgia
      [5] Atlanta
    [6] Maine
  [7] Alphabetized fruits
    [8] Pear
    [9] Ohio
    [10] Cherry`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)

  expectOutline(
    outline,
    originals,
    `
[1] Alphabetized states
  [4] Georgia
    [5] Atlanta
  [6] Maine
  [9] Ohio
  [2] Oregon
[7] Alphabetized fruits
  [3] Banana
  [10] Cherry
  [8] Pear
`,
  )
})

it.concurrent('splits a compound thought without duplicating an item that already exists', async () => {
  const input = `[] pantry
  [1] rice
  [2] beans
  [3] Pick up rice, lentils, and oats`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)

  expectOutline(
    outline,
    originals,
    `
[1] rice
[2] beans
[?] lentil
[?] oat
`,
    { anywhere: true, extra: true },
  )
  expect(
    flatten(outline).filter(node => nodeText(node, originals).toLowerCase().includes('rice')),
    formatOutline(outline, originals),
  ).toHaveLength(1)
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

  expectOutline(
    outline,
    originalTexts(input),
    `
?
  [1] yogurt
  [4] butter
?
  [2] peach
  [5] blueberry
?
  [3] broccoli
  [6] onion
`,
  )
})

it.concurrent('keeps a nested variety under its fruit when nearby items are reorganized', async () => {
  const input = `[] garage sale finds
  [1] peaches
    [2] donut peach
  [3] wrench
  [4] nectarines`
  const outline = await organizeThought(input)

  expectOutline(
    outline,
    originalTexts(input),
    `
[1] peaches
  [2] donut peach
`,
    { anywhere: true, extra: true },
  )
})

it.concurrent('does not copy a context-only marker into any output thought', async () => {
  const input = `[] ZXQ-CONTEXT-ONLY-9173
[1] apples
[2] hammer
[3] bananas
[4] screwdriver`
  const originals = originalTexts(input)
  const outline = await organizeThought(input)

  expect(formatOutline(outline, originals).toLowerCase()).not.toContain('zxq-context-only-9173')
})
