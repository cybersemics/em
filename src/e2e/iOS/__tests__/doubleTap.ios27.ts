/**
 * IOS Safari double tap tests. Runs on iOS 27, whose WebKit withholds touchend after a double tap.
 * Uses WDIO test runner with Mocha framework.
 */
import gestures from '../../../test-helpers/gestures'
import disableTransitions from '../helpers/disableTransitions'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import getScreenOffsetY from '../helpers/getScreenOffsetY'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitForElement from '../helpers/waitForElement'
import waitUntil from '../helpers/waitUntil'

describe('Double tap', () => {
  // https://github.com/cybersemics/em/issues/5660
  it('a gesture that starts just below the caret after a double tap on the caret runs its command', async () => {
    await newThought('One')
    await hideKeyboardByTappingDone()
    const editable = await waitForEditable('One')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(editable, { offset: 'One'.length, pointerType: 'touch', count: 2 })
    // a touch on the thought is covered for a moment after each tap on it, to catch the second tap of a double tap
    await browser.pause(1000)
    // if the double tap selected the word, BrowserStack leaves it selected, and a gesture is not run over a selection
    await setSelection('One'.length, 'One'.length)

    const caret = await browser.execute(() => {
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect()
      return { x: Math.round(rect.x), bottom: Math.round(rect.bottom) }
    })
    // below the editable, so em does not treat it as a press on the caret, but well inside WebKit's 44pt zone around it
    await gesture(gestures.newSubThought, {
      xStart: caret.x,
      yStart: caret.bottom + 15 + (await getScreenOffsetY()),
      segmentLength: 80,
    })

    const thoughtCount = await browser.execute(() => document.querySelectorAll('[data-editable]').length)
    expect(thoughtCount).toBe(2)
  })

  // https://github.com/cybersemics/em/issues/5660
  it('a gesture that starts just below the caret after a double tap on the caret of a note runs its command', async () => {
    // the note slides into place after the paste, and a tap aimed at it mid-slide lands on the parent thought
    await disableTransitions()
    await newThought()
    await paste(
      [''],
      `
    - One
      - =note
        - Two`,
    )
    await hideKeyboardByTappingDone()
    const note = await waitForElement('[aria-label="note-editable"]')
    await tap(note, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    // inside the word, since a faux caret sits over the end of the note
    await tap(note, { offset: 1, pointerType: 'touch', count: 2 })
    await browser.pause(1000)
    await setSelection('Two'.length, 'Two'.length, { note: true })

    const caret = await browser.execute(() => {
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect()
      return { x: Math.round(rect.x), bottom: Math.round(rect.bottom) }
    })
    await gesture(gestures.newSubThought, {
      xStart: caret.x,
      yStart: caret.bottom + 15 + (await getScreenOffsetY()),
      segmentLength: 80,
    })

    const thoughtCount = await browser.execute(() => document.querySelectorAll('[data-editable]').length)
    expect(thoughtCount).toBe(2)
  })

  // https://github.com/cybersemics/em/issues/5660
  it('a long press on a neighboring thought just after a tap on the thought being edited selects it', async () => {
    await paste(`
      - One
      - Two
    `)
    const two = await waitForEditable('Two')
    await tap(two, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    // WebDriverAgent cannot press a second point within the overlay's half second, so the overlay stays up longer
    await browser.execute(() => {
      window.em.testFlags.doubleTapWindow = 10000
    })
    await tap(two, { pointerType: 'touch' })
    await tap(await waitForEditable('One'), { pointerType: 'touch', releaseDelayMs: 1000 })

    // releasing a long press on a thought without dragging it selects it
    await browser.waitUntil(
      () =>
        browser
          .execute(() =>
            Array.from(document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]')).map(
              bullet => bullet.closest('[aria-label="child"]')?.querySelector('[data-editable]')?.textContent,
            ),
          )
          .then(selected => selected.length === 1 && selected[0] === 'One'),
      { timeout: 5000, interval: 250, timeoutMsg: 'One was not selected by the long press' },
    )
  })

  // https://github.com/cybersemics/em/issues/5660
  it('a long press on the bullet of the thought being edited just after a tap on it selects it', async () => {
    await paste(`
      - One
      - Two
    `)
    const two = await waitForEditable('Two')
    await tap(two, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await browser.execute(() => {
      window.em.testFlags.doubleTapWindow = 10000
    })
    await tap(two, { pointerType: 'touch' })

    const bullet = await browser.execute(() => {
      const editable = Array.from(document.querySelectorAll('[data-editable]')).find(el => el.textContent === 'Two')
      const rect = editable
        ?.closest('[aria-label="child"]')
        ?.querySelector('[aria-label="bullet"] svg')
        ?.getBoundingClientRect()
      return rect && { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }
    })
    if (!bullet) throw new Error('The bullet of Two was not found.')
    const screenOffsetY = await getScreenOffsetY()
    await browser.performActions([
      {
        type: 'pointer',
        id: 'pointer1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: bullet.x, y: bullet.y + screenOffsetY, origin: 'viewport' },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 1000 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])

    await browser.waitUntil(
      () =>
        browser
          .execute(() =>
            Array.from(document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]')).map(
              bullet => bullet.closest('[aria-label="child"]')?.querySelector('[data-editable]')?.textContent,
            ),
          )
          .then(selected => selected.length === 1 && selected[0] === 'Two'),
      { timeout: 5000, interval: 250, timeoutMsg: 'Two was not selected by the long press on its bullet' },
    )
  })

  // https://github.com/cybersemics/em/issues/5660
  it('a thought dragged from just after a tap on the thought being edited can be dropped on a thought under the overlay', async () => {
    await paste(`
      - One
      - Two
      - Three
    `)
    const three = await waitForEditable('Three')
    await tap(three, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await browser.execute(() => {
      window.em.testFlags.doubleTapWindow = 10000
    })
    await tap(three, { pointerType: 'touch' })

    const from = await getElementRectByScreen(await waitForEditable('Two'))
    const to = await getElementRectByScreen(await waitForEditable('One'))
    // holds for the duration before it drags
    await browser.execute('mobile: dragFromToForDuration', {
      duration: 1,
      fromX: Math.round(from.x + from.width / 2),
      fromY: Math.round(from.y + from.height / 2),
      toX: Math.round(to.x + to.width / 2),
      toY: Math.round(to.y + to.height / 2),
    })

    await browser.waitUntil(async () => (await exportThoughts()) === '\n- Two\n- One\n- Three\n', {
      timeout: 5000,
      interval: 250,
      timeoutMsg: 'Two was not dropped before One',
    })
  })
})
