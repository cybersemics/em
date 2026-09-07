import click from '../helpers/click'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** A table with two rows, each with a col1 thought and a col2 child. */
const tableText = `
  - a
    - =view
      - Table
    - bb
      - c
    - d
      - e
`

describe('table view caret navigation', () => {
  it('ArrowRight at the end of a col1 thought moves the cursor to the col2 thought (first child)', async () => {
    await paste(tableText)

    const col1 = await waitForEditable('bb')
    // place the caret at the end of the col1 thought
    await click(col1, { offset: 'bb'.length })
    await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'bb')

    await press('ArrowRight')

    // the cursor should move to the col2 thought (bb's first child)
    await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'c')
    expect(await getSelection().focusNode?.textContent).toBe('c')
  })

  it('ArrowLeft at the beginning of a col2 thought moves the cursor to the col1 parent, caret at end', async () => {
    await paste(tableText)

    const col2 = await waitForEditable('c')
    // place the caret at the beginning of the col2 thought
    await click(col2, { offset: 0 })
    await waitUntil(
      () => window.getSelection()?.focusNode?.textContent === 'c' && window.getSelection()?.focusOffset === 0,
    )

    await press('ArrowLeft')

    // the cursor should move to the col1 parent with the caret at the end
    await waitUntil(() => {
      const selection = window.getSelection()
      const focusNodeType = selection?.focusNode?.nodeType
      // offset at the end of the thought is value.length for TEXT_NODE and 1 for ELEMENT_NODE
      return (
        selection?.focusNode?.textContent === 'bb' &&
        (focusNodeType === Node.TEXT_NODE ? selection.focusOffset === 'bb'.length : selection.focusOffset === 1)
      )
    })
  })

  it('ArrowRight in the middle of a col1 thought does not cross into col2 (native caret movement)', async () => {
    await paste(tableText)

    const col1 = await waitForEditable('bb')
    // place the caret in the middle of the col1 thought
    await click(col1, { offset: 1 })
    await waitUntil(() => window.getSelection()?.focusOffset === 1)

    await press('ArrowRight')

    // the caret should remain within the col1 thought, moved one character to the right
    await waitUntil(
      () => window.getSelection()?.focusNode?.textContent === 'bb' && window.getSelection()?.focusOffset === 2,
    )
    expect(await getSelection().focusNode?.textContent).toBe('bb')
  })
})
