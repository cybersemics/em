import click from '../helpers/click'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('all platforms', () => {
  // test case 1
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

  // test case 2
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

  // test case 3
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

    // the focus must be at the beginning of 'a' after cursor up
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('a')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  // test case 4
  it('on cursorUp, the caret should move from the end of a cursor to the beginning of the new cursor.', async () => {
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

    // the focus must be at the beginning of 'a' after cursor up
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('a')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  // test case 5
  it.skip('on 2x cursorDown, the caret should move from the end of a cursor into the 2nd line of the new multi-line cursor.', async () => {
    const multiLineCursor =
      "Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended."
    const importText = `
  - a
    - b
      - c
      - ${multiLineCursor}
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('c')
    await click(editableNodeHandle, { edge: 'left' })

    await press('ArrowDown')
    await press('ArrowDown')

    // the focus must be in the middle of the multi-line thought after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(multiLineCursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(multiLineCursor.length)
  })

  // test case 6
  it('on cursorDown, the caret should move from the beginning of a multi-line cursor into the 2nd line of the same cursor.', async () => {
    const multiLineCursor =
      "Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended."
    const importText = `
  - a
    - b
      - c
      - ${multiLineCursor}
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable(multiLineCursor)
    await click(editableNodeHandle, { offset: 2 })

    await press('ArrowDown')

    // the focus must be in the middle of the multi-line cursor after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(multiLineCursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBeGreaterThan(2)
    expect(offset).toBeLessThan(multiLineCursor.length)
  })

  // test case 7
  it('on cursorDown, the caret should move from near the end of a multi-line cursor to the beginning of a new cursor.', async () => {
    const multiLineCursor =
      "Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended."
    const importText = `
  - a
    - b
      - c
      - ${multiLineCursor}
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable(multiLineCursor)
    await click(editableNodeHandle, { offset: multiLineCursor.length - 2 })

    await press('ArrowDown')

    // the focus must be at the beginning of 'd' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('d')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  // test case 8
  it('on cursorUp, the caret should move from near the beginning of a multi-line cursor to the beginning of the previous cursor.', async () => {
    const multiLineCursor =
      "Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended."
    const importText = `
  - a
    - b
      - c
      - ${multiLineCursor}
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable(multiLineCursor)
    await click(editableNodeHandle, { offset: 1 })

    await press('ArrowUp')

    // the focus must be at the beginning of 'c' after cursor up
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('c')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  // test case 9
  it('on cursorUp, the caret should move from near the end of multi-line cursor to the previous line in the same cursor.', async () => {
    const multiLineCursor =
      "Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended."
    const importText = `
  - a
    - b
      - c
      - ${multiLineCursor}
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable(multiLineCursor)
    await click(editableNodeHandle, { offset: multiLineCursor.length - 2 })

    await press('ArrowUp')

    // the focus must be in the middle of the multi-line cursor after cursor up
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(multiLineCursor)

    const offset = await getSelection().focusOffset

    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThan(multiLineCursor.length - 2)
  })

  // test case 10
  it('on cursorUp, the caret should move from the current cursor to the beginning of the multi-line cursor.', async () => {
    const multiLineCursor =
      "Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended."
    const importText = `
  - a
    - b
      - c
      - ${multiLineCursor}
      - d`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('d')
    await click(editableNodeHandle)

    await press('ArrowUp')

    // the focus must be at the beginning of the multi-line cursor after cursor up
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(multiLineCursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })

  // test case 11
  it('on cursorUp, the caret should move from the start of the 2nd line in a multi-line cursor to the start of the 1st line in the same cursor.', async () => {
    const multiLineCursor =
      "Beautiful antique furnishings fill this quiet, comfortable flat across from the Acropolis museum. AC works great. It is in an heavily touristic area, but the convenience can't be beat. Highly recommended."
    const importText = `
  - a
  - ${multiLineCursor}`

    await paste(importText)

    const editableNodeHandle = await waitForEditable(multiLineCursor)
    await click(editableNodeHandle, { y: 1 })

    await press('ArrowUp')

    // the focus must be at the start of the multi-line cursor after cursor up
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe(multiLineCursor)

    const offset = await getSelection().focusOffset
    expect(offset).toBe(0)
  })
})
