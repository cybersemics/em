import debugLog from '../../util/debugLog'
import initTouchLiftProbe from '../initTouchLiftProbe'

/** A touch point whose force and radius a test can change while the finger is held, as a real Touch might. */
const createTouch = () => ({ identifier: 0, clientX: 100, clientY: 100, force: 1, radiusX: 20, radiusY: 20 })

/** Dispatches a synthetic touch event on the given target. Its touch lists are attached directly, since jsdom does not
 * construct them. */
const dispatchTouch = (
  target: EventTarget,
  type: 'touchstart' | 'touchend',
  { touches, changedTouches }: { touches: object[]; changedTouches: object[] },
) => {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'touches', { value: touches })
  Object.defineProperty(event, 'changedTouches', { value: changedTouches })
  target.dispatchEvent(event)
}

/** The probe's entries, without the envelope fields that vary between runs. */
const probeEntries = () =>
  debugLog
    .read()
    .filter(entry => entry.type === 'liftProbe')
    .map(({ seq, t, dt, type, ...fields }) => fields)

describe('initTouchLiftProbe', () => {
  let stopProbe: () => void

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] })
    debugLog.setEnabled(true)
    debugLog.clear()
    stopProbe = initTouchLiftProbe()
  })

  afterEach(() => {
    stopProbe()
    document.body.replaceChildren()
    vi.useRealTimers()
  })

  it('logs nothing for a tap that ends before the long press delay', () => {
    const touch = createTouch()
    dispatchTouch(document.body, 'touchstart', { touches: [touch], changedTouches: [touch] })
    window.dispatchEvent(new Event('pointerup'))
    vi.advanceTimersByTime(200)
    dispatchTouch(document.body, 'touchend', { touches: [], changedTouches: [touch] })
    vi.advanceTimersByTime(1000)

    expect(probeEntries()).toEqual([])
  })

  it('logs a held touch, each change while it is held, the lift events, and how it ended', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const touch = createTouch()

    dispatchTouch(target, 'touchstart', { touches: [touch], changedTouches: [touch] })
    vi.advanceTimersByTime(250)
    window.dispatchEvent(new Event('gotpointercapture'))
    vi.advanceTimersByTime(250)
    touch.force = 0
    vi.advanceTimersByTime(100)
    window.dispatchEvent(new Event('lostpointercapture'))
    dispatchTouch(target, 'touchend', { touches: [], changedTouches: [touch] })

    expect(probeEntries()).toEqual([
      {
        phase: 'hold',
        ms: 500,
        active: false,
        connected: true,
        force: 1,
        radiusX: 20,
        radiusY: 20,
        events: ['gotpointercapture@250'],
      },
      { phase: 'change', ms: 600, active: false, connected: true, force: 0, radiusX: 20, radiusY: 20 },
      { phase: 'lostpointercapture', ms: 600 },
      { phase: 'end', end: 'touchend', ms: 600, active: false, connected: true, force: 0, radiusX: 20, radiusY: 20 },
    ])
  })

  it('ends a held touch whose touchend never arrives when the next touch begins', () => {
    const touch = createTouch()
    dispatchTouch(document.body, 'touchstart', { touches: [touch], changedTouches: [touch] })
    vi.advanceTimersByTime(1000)
    const next = { ...createTouch(), identifier: 1 }
    dispatchTouch(document.body, 'touchstart', { touches: [next], changedTouches: [next] })

    expect(probeEntries().map(({ phase, end, ms }) => ({ phase, end, ms }))).toEqual([
      { phase: 'hold', end: undefined, ms: 500 },
      { phase: 'end', end: 'nextTouch', ms: 1000 },
    ])
  })
})
