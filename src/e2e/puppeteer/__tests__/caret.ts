import { KnownDevices } from 'puppeteer'
import categorizeCommand from '../../../commands/categorize'
import newThoughtCommand from '../../../commands/newThought'
import openCommandCenterCommand from '../../../commands/openCommandCenter'
import click from '../helpers/click'
import clickBullet from '../helpers/clickBullet'
import clickNote from '../helpers/clickNote'
import clickThought from '../helpers/clickThought'
import closeKeyboard from '../helpers/closeKeyboard'
import emulate from '../helpers/emulate'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import waitForHiddenEditable from '../helpers/waitForHiddenEditable'
import waitForSelector from '../helpers/waitForSelector'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import waitUntil from '../helpers/waitUntil'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('all platforms', () => {
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

  it('clicking a bullet, the caret should move to the beginning of the parent thought', async () => {
    const importText = `
    - a
      - b
        - c`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('b')
    await click(editableNodeHandle, { offset: 1 })

    await clickBullet('b')
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

    await press('End')
    await press('Tab')
    await press('Tab', { shift: true })

    // offset at the end of the thought is value.length for TEXT_NODE and 1 for ELEMENT_NODE
    const nodeType = await getSelection().focusNode?.nodeType
    const offset = await getSelection().focusOffset
    expect(offset).toBe(nodeType === Node.TEXT_NODE ? 'chicago'.length : 1)
  })

  it('clicking backspace when the caret is at the beginning of a thought should merge it with the previous thought.', async () => {
    const importText = `
    - first
    - last`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('last')

    await click(editableNodeHandle, { edge: 'left' })
    await press('Backspace')

    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('firstlast')
  })

  it('backspace on empty thought should move caret to the end of the previous thought', async () => {
    const importText = `
    - first
    - last`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('first')
    // click on the editable at the end of the thought
    await click(editableNodeHandle, { offset: 5 })

    // press enter to create a new empty thought
    await press('Enter')

    // verify that the new thought is empty
    expect(await getEditingText()).toBe('')

    // press backspace to delete the empty thought
    await press('Backspace')

    // this is necessary because sometimes in CI, the caret is not immediately moved to the end of the previous thought
    // without this, the test will intermittently fail in CI
    await waitUntil(() => {
      const selection = window.getSelection()
      // offset at the end of the thought is value.length for TEXT_NODE and 1 for ELEMENT_NODE
      const focusNodeType = selection?.focusNode?.nodeType
      return (
        selection &&
        selection.focusNode?.textContent === 'first' &&
        (Node.TEXT_NODE === focusNodeType ? selection.focusOffset === 'first'.length : selection.focusOffset === 1)
      )
    })
  })

  it('caret should move to editable after closing the desktop command universe, then executing a cursor down command', async () => {
    const importText = `
      - a`

    await paste(importText)

    await press('p', { meta: true })
    await press('Escape')
    await press('ArrowDown')

    // Wait for the caret to move to the editable
    // because the closing of desktop command universe is asynchronous and the caret may not be in the editable yet
    // otherwise the test intermittently fails in CI.
    await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'a')

    // no assertions needed, the test will fail if the caret is not in the editable
    // If the waitUntil succeeds, the expect will always pass since we just confirmed that exact condition. If waitUntil times out, we never reach the expect anyway.
  })

  // https://github.com/cybersemics/em/issues/3956
  it('clicking a thought after editing a note should move the caret to the clicked thought', async () => {
    const importText = `
    - One
    - Two
      - =note
        - Note`

    await paste(importText)

    // click Two first so its note becomes active/enabled
    await clickThought('Two')

    // click the note to set the caret there
    await clickNote('Note')

    // click thought "One"
    await clickThought('One')

    // caret should be on "One", not "Two"
    await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'One')

    const textContent = await getSelection().focusNode?.textContent
    expect(textContent).toBe('One')
  })
})

it('clicking backspace when the caret is at the end of a thought should delete a character.', async () => {
  const importText = `
  - first
  - last`

  await paste(importText)

  const editableNodeHandle = await waitForEditable('last')

  await click(editableNodeHandle, { edge: 'right' })
  await press('Backspace')

  const textContext = await getSelection().focusNode?.textContent
  expect(textContext).toBe('las')
})

describe('mobile only', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 5000)

  it('After categorize, the caret should be on the new thought', async () => {
    const importText = `
    - a
      - b`

    await paste(importText)

    const editableHandle = await waitForEditable('b')
    await click(editableHandle, { edge: 'right' })

    // close keyboard
    await clickBullet('b')

    // perform a categorize gesture at thought b
    // previously this was done by waiting for categorize selector and clicking it from the toolbar
    // in CI and especially in mobile emulation sometimes the click was not registered due to which categorize operation was never performed, hence assertions were failing intermittently
    await gesture(categorizeCommand)

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

  it('edit mode should be enabled after deleting an empty favorited thought', async () => {
    const importText = `
    - a
    - 
      - =favorite`

    await paste(importText)

    await clickThought('')
    await clickThought('')

    await press('Backspace')

    const textContext = await getEditingText()
    expect(textContext).toBe('a')
  })

  it('tapping a thought after opening and closing Command Center via Done should not open the keyboard', async () => {
    // Step 1: create a thought
    await gesture(newThoughtCommand)
    await keyboard.type('a')

    // Step 2: open the Command Center with the ↑ gesture
    await gesture(openCommandCenterCommand)
    await waitForSelector('[data-testid=command-center-panel]')

    // Step 3: close the Command Center via the Done button
    await click('[data-testid="command-center-done"]')
    await waitForSelector('[data-testid=command-center-panel]', { hidden: true })

    // Step 4: create a second thought
    await gesture(newThoughtCommand)

    // Step 5: close the keyboard via the native Done button (blur the active element)
    await closeKeyboard()

    // Step 6: tap the first thought — keyboard should NOT open
    await clickThought('a')

    // keyboard should not open, so the active element should be the body or null
    await waitUntil(() => !document.activeElement || document.activeElement === document.body)
  })
})
