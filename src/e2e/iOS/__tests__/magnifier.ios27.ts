/**
 * IOS Safari text magnifier tests that need a newer WebKit than the suite's default device. Runs on iOS 27.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import getScreenOffsetY from '../helpers/getScreenOffsetY.js'
import getSelection from '../helpers/getSelection'
import getTextOffsetCoordinates from '../helpers/getTextOffsetCoordinates.js'
import isKeyboardShown from '../helpers/isKeyboardShown'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

describe('Magnifier', () => {
  // https://github.com/cybersemics/em/issues/6314
  it('a quick flick with the magnifier leaves the caret in the thought', async () => {
    await paste(`
      - A
      - B
    `)
    await clickThought('A')
    const editable = await waitForEditable('A')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)
    expect(await setSelection(1, 1)).toMatchObject({ type: 'Caret' })

    const caret = await getTextOffsetCoordinates(editable, 1)
    if (!caret) throw new Error('Caret coordinates not found.')
    const screenY = caret.y + (await getScreenOffsetY())

    // Press on the caret long enough for the magnifier, then flick down past the next thought and release. The hold
    // and the flick are the ones measured on an iPhone that reproduced the bug: held about half a second, then about
    // 290px in the last 60ms. A longer still hold brings up the edit menu instead.
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(caret.x), y: Math.round(screenY) },
          { type: 'pointerDown', button: 0 },
          // a pause would let the driver spread the flick across the hold
          { type: 'pointerMove', duration: 500, origin: 'pointer', x: 0, y: 0 },
          { type: 'pointerMove', duration: 60, origin: 'pointer', x: 0, y: 290 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])

    expect(await getSelection().focusNode?.textContent).toBe('A')
    expect(await getSelection().focusOffset).toBe(1)
  })
})
