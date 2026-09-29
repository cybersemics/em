import { beforeAll, expect, it } from 'vitest'
import organizeThought from '../prompts/organizeThought'

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

  expect(outline).toMatch(
    /^\[new\] (?:Food|Fruit)\n  \[1\] apples\n  \[3\] bananas\n\[new\] Tools\n  \[2\] hammer\n  \[4\] screwdriver$/,
  )
})

it.concurrent('splits a compound shopping thought into separate items', async () => {
  const input = `[] errands
  [1] Buy milk, eggs, and bread`
  const outline = await organizeThought(input)

  expect(outline.split('\n')).toHaveLength(3)
  expect(outline).toMatch(/^\[1\] (?:Buy )?milk$/m)
  expect(outline).toMatch(/^\[new\] (?:Buy )?eggs$/m)
  expect(outline).toMatch(/^\[new\] (?:Buy )?bread$/m)
})

it.concurrent('keeps a specific programming language under its category', async () => {
  const input = `[] learning plan
  [1] Programming languages
    [2] TypeScript
  [3] Vegetable gardening`

  await expect(organizeThought(input)).resolves.toBe(`[1] Programming languages
  [2] TypeScript
[3] Vegetable gardening`)
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

  await expect(organizeThought(input)).resolves.toBe(`[1] Alphabetized states
  [4] Maine
  [7] Ohio
  [2] Oregon
[5] Alphabetized fruits
  [3] banana
  [8] cherry
  [6] pear`)
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

  await expect(organizeThought(input)).resolves.toBe(`[1] Alphabetized states
  [4] Georgia
    [5] Atlanta
  [6] Maine
  [9] Ohio
  [2] Oregon
[7] Alphabetized fruits
  [3] Banana
  [10] Cherry
  [8] Pear`)
})

it.concurrent('splits a compound thought without duplicating an item that already exists', async () => {
  const input = `[] pantry
  [1] rice
  [2] beans
  [3] Pick up rice, lentils, and oats`

  await expect(organizeThought(input)).resolves.toBe(`[1] rice
[2] beans
[3] lentils
[new] oats`)
})

it.concurrent('creates dairy, fruit, and vegetable groups from a mixed grocery list', async () => {
  const input = `[] Grocery List
  [1] yogurt
  [2] peach
  [3] broccoli
  [4] butter
  [5] blueberry
  [6] onion`

  await expect(organizeThought(input)).resolves.toBe(`[new] Dairy
  [1] yogurt
  [4] butter
[new] Fruit
  [2] peach
  [5] blueberry
[new] Vegetables
  [3] broccoli
  [6] onion`)
})

it.concurrent('keeps a nested variety under its fruit when nearby items are reorganized', async () => {
  const input = `[] garage sale finds
  [1] peaches
    [2] donut peach
  [3] wrench
  [4] nectarines`

  await expect(organizeThought(input)).resolves.toContain(`[1] peaches
    [2] donut peach`)
})

it.concurrent('does not copy a context-only marker into the output', async () => {
  const input = `[] ZXQ-CONTEXT-ONLY-9173
[1] apples
[2] hammer
[3] bananas
[4] screwdriver`

  const outline = await organizeThought(input)

  expect(outline).not.toContain('ZXQ-CONTEXT-ONLY-9173')
  expect(outline).not.toContain('[]')
})
