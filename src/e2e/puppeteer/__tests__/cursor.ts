/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import helpers from '../helpers'

jest.setTimeout(20000)

const { paste, getEditingText, refresh, waitForEditable, waitForThoughtExistInDb, waitForState, clickThought } =
  helpers()

// @MIGRATION_TODO
it.skip('set the cursor to a thought in the home context on load', async () => {
  const importText = `
  - a
  - b`
  await paste(importText)
  await waitForEditable('b')
  await clickThought('b')

  await waitForState('isPushing', false)
  await waitForThoughtExistInDb('b')
  await waitForThoughtExistInDb('a')
  await refresh()

  await waitForEditable('b')

  // wait for a re-render in case the lexeme was loaded after the parent
  // getEditingText will return undefined if we don't wait
  // we don't currently have a way to tell if a lexeme is missing or just loading
  await new Promise(resolve => setTimeout(resolve, 100))

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('b')
})

// @MIGRATION_TODO

it.skip('set the cursor on a subthought on load', async () => {
  const importText = `
  - a
    - x
  - b
    - y
    - z`
  await paste(importText)
  await waitForEditable('b')
  await clickThought('b')
  await waitForEditable('z')
  await clickThought('z')

  await waitForState('isPushing', false)
  await waitForThoughtExistInDb('b')
  await waitForThoughtExistInDb('z')
  await waitForThoughtExistInDb('a')

  await refresh()

  await waitForEditable('z')

  // wait for a re-render in case the lexeme was loaded after the parent
  // getEditingText will return undefined if we don't wait
  // we don't currently have a way to tell if a lexeme is missing or just loading
  await new Promise(resolve => setTimeout(resolve, 100))

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('z')
})

// @MIGRATION_TODO
it.skip('set the cursor on the cursor uncle', async () => {
  const importText = `
  - a
    - b
      - c
    - d`
  await paste(importText)
  // click b to expand
  await waitForEditable('b')
  await clickThought('b')
  await waitForEditable('c')
  await clickThought('c')
  await waitForEditable('d')
  await clickThought('d')

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('d')
})

// @MIGRATION_TODO
it.skip('set the cursor on the cursor grandparent', async () => {
  const importText = `
  - a
    - b
      - c`
  await paste(importText)
  await waitForEditable('c')
  await clickThought('c')
  await clickThought('a')

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('a')
})

// @MIGRATION_TODO

it.skip('move the cursor up one level when clicking on a hidden ancestor', async () => {
  const importText = `
  - a
    - b
      - c
        - d`
  await paste(importText)
  await waitForEditable('d')
  await clickThought('d')
  await clickThought('a')

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('c')
})

// @MIGRATION_TODO

it.skip('move the cursor up one level when clicking on a hidden great uncle', async () => {
  const importText = `
  - a
    - b
      - c
  - d`
  await paste(importText)
  // click a to expand
  await waitForEditable('a')
  await clickThought('a')
  await waitForEditable('c')
  await clickThought('c')
  await clickThought('d')

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('b')
})
