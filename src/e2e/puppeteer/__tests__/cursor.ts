import { LAYOUT_NODE_ANIMATION_DURATION } from '../../../constants'
import sleep from '../../../util/sleep'
import helpers from '../helpers'

vi.setConfig({ testTimeout: 20000 })

const { paste, getEditingText, refresh, waitForEditable, clickThought, press } = helpers()

it('set the cursor to a thought in the home context on load', async () => {
  const importText = `
  - a
  - b`
  await paste(importText)
  await waitForEditable('b')
  await clickThought('b')

  await refresh()

  await waitForEditable('b')

  // wait for a re-render in case the lexeme was loaded after the parent
  // getEditingText will return undefined if we don't wait
  // we don't currently have a way to tell if a lexeme is missing or just loading
  await sleep(100)

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('b')
})

it('set the cursor on a subthought on load', async () => {
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
  // getting intermittent test failures so try waiting before clicking
  await sleep(LAYOUT_NODE_ANIMATION_DURATION)
  await clickThought('z')

  // wait for browser selection to update
  // getting intermittent test failures so try longer sleep
  await sleep(200)

  await refresh()

  await waitForEditable('z')

  // wait for a re-render in case the lexeme was loaded after the parent
  // getEditingText will return undefined if we don't wait
  // we don't currently have a way to tell if a lexeme is missing or just loading
  // getting intermittent test failures so try longer sleep
  await sleep(200)

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('z')
})

it('set the cursor on the cursor uncle', async () => {
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

it('set the cursor on the cursor grandparent', async () => {
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

it('do nothing when clicking on a hidden ancestor', async () => {
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
  expect(thoughtValue).toBe('d')
})

it('do nothing when clicking on a hidden great uncle', async () => {
  const importText = `
  - a
    - b
      - c
  - d`
  await paste(importText)

  // click a to expand b and c
  await waitForEditable('a')
  await clickThought('a')

  // click c to hide d
  // for some reason we need to sleep before clicking c, otherwise the cursor is moved to d
  await waitForEditable('c')
  await sleep(LAYOUT_NODE_ANIMATION_DURATION)
  await clickThought('c')
  await clickThought('d')

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('c')
})

it('set the cursor on click after cursorBack sets it to null', async () => {
  const importText = `
  - a
    - b`
  await paste(importText)
  await waitForEditable('b')
  await clickThought('a')
  await press('Escape')
  await clickThought('a')

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('a')
})
