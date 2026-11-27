/** Native iOS gesture regression tests. */
import gestures from '../../../test-helpers/gestures'
import $ from '../helpers/$'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import getSelectionEndHandlePosition from '../helpers/getSelectionEndHandlePosition'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

/** Pixels the Safari chrome offsets the page by: `getBoundingClientRect` reports page coordinates while
 * `performActions` delivers touches in screen coordinates. This is the same offset that `tap` callers pass, measured
 * here as 59px on an iPhone 15 Plus. */
const SAFARI_CHROME_OFFSET_Y = 60

/**
 * Get the screen coordinates of the caret, ready to be passed to `gesture` or `performActions`.
 *
 * A caret is a zero-width rect roughly one line tall inside an editable barely taller than it, so unlike a tap on a
 * whole element this has no slack: a touch that misses by more than a few pixels lands outside the thought entirely.
 */
const getCaretPosition = async (): Promise<{ x: number; y: number }> => {
  const raw = await browser.execute(() => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return ''

    const rect = selection.getRangeAt(0).getBoundingClientRect()
    return rect.height ? JSON.stringify({ x: rect.x, y: rect.y, height: rect.height }) : ''
  })
  if (!raw) throw new Error('Caret rect not found. Is the caret in a text node?')

  const rect = JSON.parse(raw) as { x: number; y: number; height: number }
  return { x: Math.round(rect.x), y: Math.round(rect.y + rect.height / 2 + SAFARI_CHROME_OFFSET_Y) }
}

/** Counts the thoughts rendered in the thoughtspace. */
const thoughtCount = () => browser.execute(() => document.querySelectorAll('[data-editable]').length)

describe('Gestures', () => {
  // https://github.com/cybersemics/em/issues/4521
  it('keeps native text selection active without opening the gesture menu when dragging an end handle', async () => {
    const text = 'one two three four five six seven eight nine ten'
    await newThought()
    await keyboard.type(text)
    await waitForEditable(text)
    expect(await setSelection(0, 3)).toMatchObject({ text: 'one', type: 'Range' })

    const handle = await getSelectionEndHandlePosition()
    await gesture('d', { segmentLength: 90, waitMs: 600, xStart: handle.x, yStart: handle.y })

    // This runs after the touch is released, so it can only catch a gesture menu that is stuck open
    // (the #3887 failure mode) — a menu that flashed during the drag is already gone by now.
    const gestureMenu = await $('[data-testid=popup-value]')
    expect(await gestureMenu.isExisting()).toBe(false)

    // This is the assertion that detects the regression: on the pre-fix code the hijacked handle
    // drag collapses the selection to '', while the menu check above still passes.
    expect(await getSelection().toString()).toContain('one two')
  })

  // https://github.com/cybersemics/em/issues/3763
  it('does not run a command when a gesture starts on the caret', async () => {
    const text = 'one two three four five six seven eight'
    // newThought runs this same gesture away from the caret, so the test cannot reach its assertion
    // unless the gesture works here
    await newThought()
    await keyboard.type(text)
    await waitForEditable(text)
    expect(await setSelection(12, 12)).toMatchObject({ type: 'Caret' })

    const caret = await getCaretPosition()
    await gesture(gestures.newThought, { xStart: caret.x, yStart: caret.y })

    // A press on the caret belongs to the magnifier, so the swipe must not be read as New Thought.
    expect(await thoughtCount()).toBe(1)
  })

  // https://github.com/cybersemics/em/issues/3763
  it('runs a command when a gesture passes through the caret without starting on it', async () => {
    const text = 'one two three four five six seven eight'
    await newThought()
    await keyboard.type(text)
    await waitForEditable(text)
    expect(await setSelection(12, 12)).toMatchObject({ type: 'Caret' })
    expect(await getEditingText()).toBe(text)

    // Start clear of the caret's zone and swipe right through it. Only the touch that *starts* on the caret belongs to
    // the magnifier; one that merely crosses it is an ordinary gesture.
    const caret = await getCaretPosition()
    await gesture('r', { xStart: caret.x - 40, yStart: caret.y, segmentLength: 80 })

    // Back clears the cursor when the thoughtspace holds a single thought, so no thought is being edited afterwards.
    const cursorCleared = await waitUntil(async () => (await getEditingText()) === undefined)
    expect(cursorCleared).toBeTruthy()
  })
})

/**
 * Measures how thick the gesture trace is across a horizontal stroke, in CSS pixels.
 * Counts the pixels of the canvas column at x that are more than 10% opaque. Dividing by the canvas's scale lets
 * canvases drawn at different device pixel ratios compare in CSS pixels. Returns 0 when the column has no ink.
 */
const getTraceThickness = (x: number) =>
  browser.execute((x: number) => {
    const canvas = document.querySelector('[data-testid=gesture-trace] canvas') as HTMLCanvasElement
    const scale = canvas.width / canvas.clientWidth
    const column = canvas.getContext('2d')!.getImageData(Math.round(x * scale), 0, 1, canvas.height).data
    const opaque = column.filter((value, i) => i % 4 === 3 && value > 25).length
    return opaque / scale
  }, x)

/** Scrolls the thoughtspace down with a swipe up in the scroll zone, the right quarter of the screen. */
const scrollDown = async () => {
  const { width, height } = await browser.getWindowSize()
  const x = Math.round(width - 40)
  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y: Math.round(height * 0.75), origin: 'viewport' },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerMove', duration: 300, x, y: Math.round(height * 0.25), origin: 'viewport' },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

describe('Gesture trace', () => {
  // https://github.com/cybersemics/em/issues/3880
  it('keeps the same glow width after a scroll collapses the Safari toolbar', async () => {
    // The glow's blur is measured in canvas pixels, so the glow only keeps its width in CSS pixels if every canvas size
    // uses the device pixel ratio. Collapsing the toolbar resizes the window and the canvas. Most of the trace's
    // thickness is glow, so a canvas resized at another ratio shows up as a thinner trace.
    // Enough thoughts to scroll the page. The import moves the cursor to the last thought and scrolls it into view, so
    // scroll back to the top, where a swipe can scroll down.
    await paste(Array.from({ length: 50 }, (_, i) => `- ${i + 1}`).join('\n'))
    await browser.execute(() => window.em.testHelpers.scrollTo(0))
    await browser.waitUntil(() => browser.execute(() => window.scrollY === 0), {
      timeoutMsg: 'the page did not scroll to the top after the import',
    })

    const { height } = await browser.getWindowSize()
    // 'rr' is bound to no command, so the gesture draws a trace without changing the thoughts or the scroll position.
    const stroke = { xStart: 100, yStart: Math.round(height / 2), segmentLength: 80 }
    const x = stroke.xStart + stroke.segmentLength

    await gesture('rr', stroke)
    await browser.waitUntil(async () => (await getTraceThickness(x)) > 0, {
      timeoutMsg: 'the first gesture drew no trace',
    })
    const thicknessBeforeScroll = await getTraceThickness(x)

    const innerHeight = await browser.execute(() => window.innerHeight)
    await scrollDown()
    await browser.waitUntil(() => browser.execute((h: number) => window.innerHeight !== h, innerHeight), {
      timeoutMsg: 'the scroll did not collapse the Safari toolbar',
    })

    // Resizing the canvas clears it, so a canvas with no ink at x has been resized since the first gesture.
    // The window height must also hold still between two polls, so that no late resize clears the next stroke.
    let lastInnerHeight = 0
    await browser.waitUntil(
      async () => {
        const canvas = await browser.execute((x: number) => {
          const canvas = document.querySelector('[data-testid=gesture-trace] canvas') as HTMLCanvasElement
          const scale = canvas.width / canvas.clientWidth
          const column = canvas.getContext('2d')!.getImageData(Math.round(x * scale), 0, 1, canvas.height).data
          return {
            cleared: column.every((value, i) => i % 4 !== 3 || value === 0),
            scaled: canvas.width === Math.round(canvas.clientWidth * window.devicePixelRatio),
            innerHeight: window.innerHeight,
          }
        }, x)
        const settled = canvas.innerHeight === lastInnerHeight
        lastInnerHeight = canvas.innerHeight
        return canvas.cleared && canvas.scaled && settled
      },
      { timeoutMsg: 'the trace canvas was not resized at the device pixel ratio after the toolbar collapsed' },
    )

    await gesture('rr', stroke)
    await browser.waitUntil(async () => (await getTraceThickness(x)) > 0, {
      timeoutMsg: 'the second gesture drew no trace',
    })
    const thicknessAfterScroll = await getTraceThickness(x)

    // Allow 2px for differences in stroke speed and anti-aliasing between the two strokes.
    expect(thicknessAfterScroll).toBeGreaterThanOrEqual(thicknessBeforeScroll - 2)
    expect(thicknessAfterScroll).toBeLessThanOrEqual(thicknessBeforeScroll + 2)
  })
})
