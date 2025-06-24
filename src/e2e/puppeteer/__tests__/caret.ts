import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickBullet from '../helpers/clickBullet'
import clickThought from '../helpers/clickThought'
import emulate from '../helpers/emulate'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import waitForHiddenEditable from '../helpers/waitForHiddenEditable'
import waitForSelector from '../helpers/waitForSelector'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import waitUntil from '../helpers/waitUntil'
import waitForResize from '../helpers/waitForResize'

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

    const first = await waitForEditable('first')

    await click(first)
    await press('Enter')
    await press('Backspace')

    // Wait for requestAnimationFrame to complete
    await waitForResize()

    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('first')

    const offset = await getSelection().focusOffset

    // offset at the end of the thought is value.length for TEXT_NODE and 1 for ELEMENT_NODE
    const focusNodeType = await getSelection().focusNode?.nodeType
    expect(offset).toBe(focusNodeType === Node.TEXT_NODE ? 'first'.length : 1)
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
    await emulate(KnownDevices['iPhone 11'])
  }, 5000)

  it('After categorize, the caret should be on the new thought', async () => {
    const importText = `
    - a
      - b`

    await paste(importText)

    await clickThought('b')
    await clickThought('b')

    // close keyboard
    await clickBullet('b')

    await waitForSelector('[aria-label="Categorize"]')
    await click('[aria-label="Categorize"]')

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
