import { beforeAll, expect, it } from 'vitest'
import generateThought from '../prompts/generateThought'

beforeAll(() => {
  if (!process.env.OPENAI_API_KEY_GENERATE_THOUGHT && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY_GENERATE_THOUGHT or OPENAI_API_KEY is required')
  }
})

it.concurrent('completes the next US state in an alphabetical list', async () => {
  await expect(
    generateThought(`[] States in Alphabetical Order
  [] Arizona
  [] Arkansas
  [x]
  [] Colorado`),
  ).resolves.toBe('California')
})

it.concurrent('corrects a misspelled grocery item', async () => {
  await expect(
    generateThought(`[] Grocery List
  [] Apples
  [x] Carrrots
  [] Onions`),
  ).resolves.toBe('Carrots')
})

it.concurrent('completes an empty thought from parent and sibling context', async () => {
  await expect(
    generateThought(`[] Days of the week
  [] Monday
  [] Tuesday
  [x]
  [] Thursday`),
  ).resolves.toBe('Wednesday')
})

it.concurrent('completes a partial thought', async () => {
  await expect(
    generateThought(`[] States in Alphabetical Order
  [] Arizona
  [] Arkansas
  [x] Cal
  [] Colorado`),
  ).resolves.toBe('California')
})

it.concurrent('does not copy a context-only marker into the output', async () => {
  const thought = await generateThought(`[] ZXQ-CONTEXT-ONLY-9173
  [] apple
  [] banana
  [x]
  [] date`)

  expect(thought.trim().length).toBeGreaterThan(0)
  expect(thought).not.toContain('ZXQ-CONTEXT-ONLY-9173')
  expect(['apple', 'banana', 'date']).not.toContain(thought)
})

it.concurrent('completes an unseen alphabetical US state', async () => {
  await expect(
    generateThought(`[] States in Alphabetical Order
  [] Florida
  [] Georgia
  [x]
  [] Idaho`),
  ).resolves.toBe('Hawaii')
})

it.concurrent('corrects an unseen misspelled grocery item', async () => {
  await expect(
    generateThought(`[] Grocery List
  [] Apples
  [x] tommato
  [] Onions`),
  ).resolves.toBe('Tomato')
})

it.concurrent('generates a nested state capital from sibling context', async () => {
  await expect(
    generateThought(`[] US state capitals
  [] California
    [] Sacramento
  [] Texas
    [] Austin
  [] New York
    [x]
  [] Florida
    [] Tallahassee
  [] Washington
    [] Olympia`),
  ).resolves.toBe('Albany')
})

it.concurrent('replaces a thought that does not belong in the sequence', async () => {
  await expect(
    generateThought(`[] Days of the week
  [] Monday
  [] Tuesday
  [x] banana
  [] Thursday`),
  ).resolves.toBe('Wednesday')
})

it.concurrent('completes a top-level color sequence', async () => {
  await expect(
    generateThought(`[] Red
[] Orange
[] Yellow
[x]
[] Blue
[] Purple`),
  ).resolves.toBe('Green')
})
