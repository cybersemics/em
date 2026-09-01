/**
 * IOS Safari text magnifier (loupe) tests.
 * Uses WDIO test runner with Mocha framework.
 */
import dragMagnifier from '../helpers/dragMagnifier'
import getSelection from '../helpers/getSelection'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import observeDragActivation from '../helpers/observeDragActivation'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

describe('Magnifier', () => {
  // https://github.com/cybersemics/em/issues/3763
  it.skip('dragging the magnifier moves the caret instead of dragging the thought', async () => {
    const value = 'the quick brown fox'
    await newThought(value)
    const editable = await waitForEditable(value)
    await waitUntil(isKeyboardShown)

    // place the caret in the middle of the text, where a person reaches for the magnifier
    await tap(editable, { offset: 10, y: 60, pointerType: 'touch' })
    expect(await getSelection().focusNode?.textContent).toBe(value)
    const offsetBefore = await getSelection().focusOffset

    const readDragActivation = await observeDragActivation()
    await dragMagnifier(editable, 60, { offset: 10 })
    const dragActivation = await readDragActivation()
    const offsetAfter = await getSelection().focusOffset
    console.info('magnifier drag', { offsetBefore, offsetAfter, ...dragActivation })

    expect(dragActivation).toEqual({ dragHold: false, dragInProgress: false })
    expect(await getSelection().focusNode?.textContent).toBe(value)
  })
})
