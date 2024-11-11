import click from '../helpers/click'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('toggle sidebar', () => {
  it('when clicking the menu button twice to open & close the sidebar, the caret offset should be preserved once it closes.', async () => {
    const cursor = 'Hello'
    const importText = `
    - ${cursor}`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    await click(editableNodeHandle, { offset: 1 })

    await click('[aria-label=menu]')
    await click('[aria-label=menu]')

    // the focus must be after 'H' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(cursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBe(1)
  })

  it('when clicking the menu button then pressing Escape to open & close the sidebar, the caret offset should be preserved once it closes.', async () => {
    const cursor = 'Hello'
    const importText = `
    - ${cursor}`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    await click(editableNodeHandle, { offset: 2 })

    await click('[aria-label=menu]')
    await new Promise(r => setTimeout(r, 1000))
    await press('Escape')

    // the focus must be after 'e' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(cursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBe(2)
  })

  it('when clicking the menu button then clicking in empty space to open & close the sidebar, the caret offset should be preserved once it closes.', async () => {
    const cursor = 'Hello'
    const importText = `
    - ${cursor}`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    await click(editableNodeHandle, { offset: 3 })

    await click('[aria-label=menu]')
    await click('[data-testid=sidebar] [aria-hidden=true]')

    // the focus must be after 'l' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(cursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBe(3)
  })
})
