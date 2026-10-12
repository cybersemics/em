/**
 * TEMPORARY DIAGNOSTIC. Records which events reach the page when a gesture is drawn over a thought that is not being
 * edited, on iOS 27, with and without the double tap that makes WebKit withhold touch events (#5660).
 */
import gestures from '../../../test-helpers/gestures'
import gesture from '../helpers/gesture'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import getSelection from '../helpers/getSelection'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import setSelection from '../helpers/setSelection'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

/** Installs listeners that record every input event that reaches the window. */
const startRecording = () =>
  browser.execute(() => {
    const w = window as unknown as {
      __events: unknown[]
      em: { debugLog: { setEnabled(b: boolean): void; clear(): void } }
    }
    w.__events = []
    const t0 = performance.now()
    const types = [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'mousedown',
      'mousemove',
      'mouseup',
      'click',
      'contextmenu',
      'selectionchange',
      'scroll',
      'focusin',
      'focusout',
    ]
    types.forEach(type =>
      (type === 'selectionchange' ? document : window).addEventListener(
        type,
        (e: Event) => {
          const te = e as TouchEvent
          const pe = e as PointerEvent
          const touch = te.changedTouches?.[0]
          const target = e.target as Element | null
          w.__events.push({
            type,
            t: Math.round(performance.now() - t0),
            x: Math.round(touch?.clientX ?? pe.clientX ?? -1),
            y: Math.round(touch?.clientY ?? pe.clientY ?? -1),
            touches: te.touches?.length,
            cancelable: e.cancelable,
            target: target?.getAttribute?.('aria-label') ?? target?.nodeName ?? null,
          })
        },
        { capture: true, passive: true },
      ),
    )
    w.em.debugLog.setEnabled(true)
    w.em.debugLog.clear()
  })

/** Prints the recorded events and the app's debug log, and returns what the assertions need. */
const report = async (label: string) => {
  const raw = await browser.execute(() => {
    const w = window as unknown as {
      __events: { type: string }[]
      em: { debugLog: { format(state?: unknown): string } }
    }
    // collapse runs of the same continuous event so the report stays short
    const collapsed = w.__events.reduce<{ type: string; n?: number }[]>((acc, e) => {
      const last = acc[acc.length - 1]
      if (last && last.type === e.type && ['touchmove', 'pointermove', 'mousemove', 'scroll'].includes(e.type)) {
        last.n = (last.n ?? 1) + 1
        return acc
      }
      return [...acc, { ...e }]
    }, [])
    return JSON.stringify({
      events: collapsed,
      log: w.em.debugLog.format().split('\n--- state.thoughts')[0],
      alert: document.querySelector('[data-testid="alert-content"]')?.textContent ?? null,
      thoughts: Array.from(document.querySelectorAll('[data-editable]')).map(el => el.textContent),
      editing: document.querySelector('[data-editing=true] [data-editable]')?.textContent ?? null,
    })
  })
  const parsed = JSON.parse(raw) as {
    events: unknown[]
    log: string
    alert: string | null
    thoughts: string[]
    editing: string | null
  }
  console.info(`\n===== DIAGNOSTIC ${label} =====`)
  console.info(`alert: ${parsed.alert}`)
  console.info(`thoughts: ${JSON.stringify(parsed.thoughts)}`)
  console.info(`editing: ${parsed.editing}`)
  parsed.events.forEach(e => console.info(`EVENT ${JSON.stringify(e)}`))
  parsed.log.split('\n').forEach(line => console.info(`LOG ${line}`))
  console.info(`===== END DIAGNOSTIC ${label} =====\n`)
  return parsed
}

describe('Gesture over a thought (diagnostic)', () => {
  it('after a double tap on the caret of another thought', async () => {
    await newThought('One')
    await newThought('Two')
    await hideKeyboardByTappingDone()
    const one = await waitForEditable('One')
    await tap(one, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(one, { offset: 'One'.length, pointerType: 'touch', count: 2 })
    await waitUntil(async () => (await getSelection().toString()) === 'One')
    await setSelection('One'.length, 'One'.length)

    const two = await waitForEditable('Two')
    const rect = await getElementRectByScreen(two)
    await startRecording()
    await gesture(gestures.newThought, { xStart: rect.x + 20, yStart: rect.y + rect.height / 2 })
    await browser.pause(1500)
    const result = await report('double tap')

    expect(result.alert).toBe(null)
    expect(result.thoughts.length).toBe(3)
  })

  it('while another thought is being edited', async () => {
    await newThought('One')
    await newThought('Two')
    await hideKeyboardByTappingDone()
    const one = await waitForEditable('One')
    await tap(one, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    const two = await waitForEditable('Two')
    const rect = await getElementRectByScreen(two)
    await startRecording()
    await gesture(gestures.newThought, { xStart: rect.x + 20, yStart: rect.y + rect.height / 2 })
    await browser.pause(1500)
    const result = await report('editing')

    expect(result.alert).toBe(null)
    expect(result.thoughts.length).toBe(3)
  })
})
