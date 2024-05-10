import { KnownDevices } from 'puppeteer'
import helpers from '../helpers'

vi.setConfig({ testTimeout: 20000 })

describe('all platforms', () => {
  const {
    click,
    clickBullet,
    clickThought,
    down,
    getSelection,
    paste,
    press,
    refresh,
    waitForEditable,
    waitUntil,
    waitForThoughtExistInDb,
  } = helpers()

  // TODO: Why is this failing?
  it.skip('caret should be at the beginning of thought after split on enter', async () => {
    const importText = `
    - puppeteer
      - web scraping
    - insomnia
      - rest api`
    await paste(importText)
    await clickThought('puppeteer')
    await clickThought('web scraping')

    const editableNodeHandle = await waitForEditable('web scraping')
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
    await click(editableNodeHandle, { edge: 'left' })

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('clicking on the right edge of a thought, the caret should move to the end of the thought.', async () => {
    const importText = `
    - Richard Feynman`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Richard Feynman')

    await click(editableNodeHandle, { edge: 'left' })
    await waitUntil(() => window.getSelection()?.focusOffset === 0)
    await click(editableNodeHandle, { edge: 'right' })

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
    await click(editableNodeHandle, { edge: 'left' })

    await press('ArrowDown')

    // the focus must be in Dogs/Labrador after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('Labrador')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('when cursor is null, clicking on a thought after refreshing page, caret should be set on first click', async () => {
    const importText = `
    - a
    - b`

    await paste(importText)
    await clickThought('a')

    // Set cursor to null
    await click('#content')

    await waitForThoughtExistInDb('a')
    await waitForThoughtExistInDb('b')

    await refresh()

    await waitForEditable('b')
    await clickThought('b')

    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('b')
  })

  // https://github.com/cybersemics/em/issues/1568
  it('caret at the end of a thought should be preserved on indent and outdent', async () => {
    const importText = `
    - a
    - chicago`
    await paste(importText)
    await clickThought('chicago')

    // await press('Enter')
    await press('End')
    await press('Tab')
    await down('Shift')
    await press('Tab')

    const nodeType = await getSelection().focusNode?.nodeType
    expect(nodeType).toBe(Node.ELEMENT_NODE)
    const offset = await getSelection().focusOffset
    expect(offset).toBe(1)
  })
})

describe('mobile only', () => {
  const {
    click,
    clickBullet,
    clickThought,
    paste,
    getEditingText,
    getSelection,
    waitForEditable,
    waitForHiddenEditable,
  } = helpers({ emulatedDevice: KnownDevices['iPhone 11'] })

  it('After subcategorizeOne, the caret should be on the new thought', async () => {
    const importText = `
    - a
      - b`

    await paste(importText)

    await clickThought('b')
    await clickThought('b')

    // close keyboard
    await clickBullet('b')

    await click('[aria-label="Subcategorize"]')

    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  // TODO: waitForHiddenEditable is broken after virtualizing thoughts
  it.skip('do nothing when a hidden uncle is clicked', async () => {
    const importText = `
    - a
      - b
        - c
    - d`

    await paste(importText)
    await clickThought('a')
    await clickThought('c')

    await waitForHiddenEditable('d')
    await clickThought('d')

    await waitForEditable('a')

    const cursorText = await getEditingText()
    expect(cursorText).toBe('c')
  })

  it.skip('edit mode should be disabled after opening a modal', async () => {
    const importText = `
    - a
      - b`

    await paste(importText)

    await clickThought('b')
    await clickThought('b')

    // TODO: Why is the selection on the breadcrumbs? Edit mode should be active on b.
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('b')

    // const focusNodeTypeBefore = await getSelection().focusNode?.nodeType
    // expect(focusNodeTypeBefore).toBe(Node.TEXT_NODE)

    await click('[aria-label="Export"]')
    await click('.popup-close-x')

    const focusNode = await getSelection().focusNode
    expect(focusNode).toBeUndefined()
  })
})
