import click from '../helpers/click'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('all platforms', () => {
  it('on toggleSidebar, the caret offset should be preserved once it closes.', async () => {
    const cursor = 'Hello'
    const importText = `
    - ${cursor}`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    await click(editableNodeHandle, { offset: 1 })

    await click('[aria-label=menu]')
    await page.waitForSelector('[aria-label=sidebar] .fade-enter-done')
    await click('[aria-label=menu]')

    // the focus must be after 'H' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(cursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBe(1)
  })
})
