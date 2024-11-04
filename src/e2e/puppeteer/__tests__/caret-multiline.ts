import click from '../helpers/click'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('all platforms', () => {
  it('on cursorDown, the caret should move from the beginning of a cursor to the beginning of the new cursor.', async () => {
    const importText = `
    - a
      - b
        - c
        - Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended.
        - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('a')
    await click(editableNodeHandle, { edge: 'left' })

    await press('ArrowDown')

    // the focus must be at the beginning of 'b' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('b')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('on cursorDown, the caret should move from the end of a cursor to the beginning of the new cursor.', async () => {
    const importText = `
  - a
    - b
      - c
      - Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended.
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('a')
    await click(editableNodeHandle, { edge: 'right' })

    await press('ArrowDown')

    // the focus must be at the beginning of 'b' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('b')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('on cursorUp, the caret should move from the beginning of a cursor to the beginning of the new cursor.', async () => {
    const importText = `
    - a
      - b
        - c
        - Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended.
        - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('b')
    await click(editableNodeHandle, { edge: 'left' })

    await press('ArrowUp')

    // the focus must be at the beginning of 'b' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('a')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  it('on cursorUp, the caret should move from the end of a cursor to the end of the new cursor.', async () => {
    const importText = `
  - a
    - b
      - c
      - Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended.
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('b')
    await click(editableNodeHandle, { edge: 'right' })

    await press('ArrowUp')

    // the focus must be at the beginning of 'b' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('a')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })
})
