/**
 * IOS Safari caret positioning tests.
 * Uses WDIO test runner with Mocha framework.
 */
import getSelection from '../helpers/getSelection'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

// tests succeeds individually, but fails when there are too many tests running in parallel
// https://github.com/cybersemics/em/issues/1475
// https://github.com/cybersemics/em/issues/1523

describe('Caret', () => {
  it('Enter edit mode', async () => {
    await newThought('foo')
    await hideKeyboardByTappingDone()

    const editableNodeHandle = await waitForEditable('foo')
    await tap(editableNodeHandle, { y: 60, x: 20 })

    await waitUntil(isKeyboardShown)
    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('foo')
  })
})
