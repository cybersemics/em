/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */
import { devices } from 'puppeteer'
import helpers from '../helpers'
import { WindowEm } from '../../../initialize'

jest.setTimeout(20000)

describe('all platforms', () => {
  const {
    click,
    clickBullet,
    clickThought,
    getSelection,
    paste,
    press,
    refresh,
    waitForEditable,
    waitUntil,
    waitForState,
    waitForThoughtExistInDb,
  } = helpers()

  it('caret should be at the beginning of thought after split on enter', async () => {
    const importText = `
    - puppeteer
      - web scrapping
    - insomnia
      - rest api`
    await paste(importText)
    await clickThought('puppeteer')
    await clickThought('web scrapping')

    const editableNodeHandle = await waitForEditable('web scrapping')
    await click(editableNodeHandle, { offset: 3 })

    await press('Enter')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('clicking a bullet, the caret should move to the beginning of the thought', async () => {
    const importText = `
    - Don't stay awake for too long
      - I don't wanna fall asleep`

    await paste(importText)

    const editableNodeHandle = await waitForEditable("I don't wanna fall asleep")
    await click(editableNodeHandle, { offset: 10 })

    await clickBullet("Don't stay awake for too long")
    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('clicking on the left edge of a thought, the caret should move to the beginning of the thought.', async () => {
    const importText = `
    - Purple Rain`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Purple Rain')

    await click(editableNodeHandle, { offset: 5 })
    await waitUntil(() => window.getSelection()?.focusOffset === 5)
    await click(editableNodeHandle, { horizontalClickLine: 'left' })

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('clicking on the right edge of a thought, the caret should move to the end of the thought.', async () => {
    const importText = `
    - Richard Feynman`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Richard Feynman')

    await click(editableNodeHandle, { horizontalClickLine: 'left' })
    await waitUntil(() => window.getSelection()?.focusOffset === 0)
    await click(editableNodeHandle, { horizontalClickLine: 'right' })

    const offset = await getSelection().focusOffset
    expect(offset).toBe('Richard Feynman'.length)
  })

  it('clicking in the middle of a thought, the caret should be set to the point that is clicked.', async () => {
    const importText = `
    - Freddie Mercury`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Freddie Mercury')

    // click on the given offset node of the editable using mouse click
    await click(editableNodeHandle, { offset: 7 })

    const offset = await getSelection().focusOffset
    expect(offset).toBe(7)
  })

  it('on cursorDown, the caret should move to the beginning of the new cursor.', async () => {
    const importText = `
    - Dogs
      - Husky
      - Labrador
      - Golden Retriever`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Husky')
    await click(editableNodeHandle, { horizontalClickLine: 'left' })

    await press('ArrowDown')

    // the focus must be in Dogs/Labrador after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('Labrador')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  // @MIGRATION_TODO
  it.skip('when cursor is null, clicking on a thought after refreshing page, caret should be set on first click', async () => {
    const importText = `
    - a
    - b`

    await paste(importText)
    await clickThought('a')

    // Set cursor to null
    await click('#content')

    await waitForState('isPushing', false)
    await waitForThoughtExistInDb('a')
    await waitForThoughtExistInDb('b')

    await refresh()

    await waitForEditable('b')
    await clickThought('b')

    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('b')
  })
})

describe('mobile only', () => {
  const {
    click,
    clickBullet,
    paste,
    getEditingText,
    getSelection,
    waitForEditable,
    waitForHiddenEditable,
    waitForState,
    clickThought,
    ref,
  } = helpers({ emulatedDevice: devices['iPhone 11'] })

  it('when subCategorizeOne, caret should be on new thought', async () => {
    const importText = `
    - A
      - B`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('B')
    await click(editableNodeHandle, { horizontalClickLine: 'left' })

    // to close keyboard
    await clickBullet('B')

    await click('#subcategorizeOne')

    await waitForState('editing', true)

    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('on clicking the hidden thought, caret should be on the parent thought of editing thought', async () => {
    const importText = `
    - A
      - B
        -C
    - D`

    await paste(importText)
    await clickThought('A')
    await clickThought('C')

    await waitForHiddenEditable('D')
    await clickThought('D')

    await waitForEditable('A')

    const cursorText = await getEditingText()
    expect(cursorText).toBe('B')
  })

  it('while editing true, after opening modal the editing should be false', async () => {
    const importText = `
    - A
      - B`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('B')
    await click(editableNodeHandle, { horizontalClickLine: 'left' })
    await click(editableNodeHandle, { horizontalClickLine: 'left' })

    await waitForState('editing', true)

    await click('#exportContext')
    await click('.popup-close-x')

    await waitForState('editing', false)
    const editingValue = await ref().evaluate(() => (window.em as WindowEm).testHelpers.getState().editing)
    expect(editingValue).toBe(false)
  })
})
