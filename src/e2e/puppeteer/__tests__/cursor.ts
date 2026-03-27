import sleep from '../../../util/sleep'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('set the cursor to a thought in the home context on load', async () => {
  const importText = `
  - a
  - b`
  await paste(importText)
  await waitForEditable('b')
  await clickThought('b')

  await refresh()

  await waitForEditable('b')

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
  await clickThought('z')

  // wait for browser selection to update
  // getting intermittent test failures at 200ms so try longer sleep
  await sleep(400)

  await refresh()

  await waitForEditable('z')

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

it('move cursor from formatted thought to first unformatted thought in descending order', async () => {
  await paste(`
    - fruits
      - apple
      - orange
      - banana
      - pear
  `)

  // Wait for the thought to be editable and click it
  await waitForEditable('apple')
  await clickThought('apple')

  // Toggle sort twice (ascending then descending)
  await click('[data-testid="toolbar-icon"][aria-label="Sort Picker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

  await click('[data-testid="toolbar-icon"][aria-label="Sort Picker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

  // Make text bold using the toolbar
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')

  // Press arrow down to move cursor
  await press('ArrowDown')

  // TODO: Wait for specific state
  // Succeeds 10/10 with sleep.
  // Fails 8/10 without sleep.
  await sleep(200)

  // Verify cursor moved to 'pear' (when cursorDown)
  const downThoughtValue = await getEditingText()
  expect(downThoughtValue).toBe('pear')

  await press('ArrowUp')
  await press('ArrowUp')

  // Verify cursor moved to 'fruits' (when cursorUp)
  const upThoughtValue = await getEditingText()
  expect(upThoughtValue).toBe('fruits')
})
