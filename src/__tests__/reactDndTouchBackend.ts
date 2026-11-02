import type { DragDropManager } from 'dnd-core'
import { TouchBackendImpl } from 'react-dnd-touch-backend'

let backend: TouchBackendImpl | undefined

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  backend?.teardown()
  backend = undefined
  vi.useRealTimers()
})

// https://github.com/cybersemics/em/issues/4839
it('prefers touchend when pointerup arrives first', async () => {
  let isDragging = true
  const drop = vi.fn()
  const endDrag = vi.fn(() => {
    isDragging = false
  })
  const manager = {
    getActions: () => ({ drop, endDrag }),
    getMonitor: () => ({
      didDrop: () => false,
      isDragging: () => isDragging,
    }),
  } as unknown as DragDropManager

  backend = new TouchBackendImpl(manager, { window }, { rootElement: document })
  backend.setup()

  const pointerUp = new Event('pointerup', { bubbles: true, cancelable: true })
  document.dispatchEvent(pointerUp)

  expect(pointerUp.defaultPrevented).toBe(true)
  expect(drop).not.toHaveBeenCalled()
  expect(endDrag).not.toHaveBeenCalled()

  document.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }))

  expect(drop).toHaveBeenCalledOnce()
  expect(endDrag).toHaveBeenCalledOnce()

  await vi.runOnlyPendingTimersAsync()

  expect(drop).toHaveBeenCalledOnce()
  expect(endDrag).toHaveBeenCalledOnce()
})

// https://github.com/cybersemics/em/issues/4315
it('ends the drag from pointerup when touchend is missing', async () => {
  let isDragging = true
  const drop = vi.fn()
  const endDrag = vi.fn(() => {
    isDragging = false
  })
  const manager = {
    getActions: () => ({ drop, endDrag }),
    getMonitor: () => ({
      didDrop: () => false,
      isDragging: () => isDragging,
    }),
  } as unknown as DragDropManager

  backend = new TouchBackendImpl(manager, { window }, { rootElement: document })
  backend.setup()

  document.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }))

  expect(drop).not.toHaveBeenCalled()
  expect(endDrag).not.toHaveBeenCalled()

  await vi.runOnlyPendingTimersAsync()

  expect(drop).toHaveBeenCalledOnce()
  expect(endDrag).toHaveBeenCalledOnce()
})

describe('long press delay', () => {
  const delayTouchStart = 400
  const touchSlop = 10

  /** Creates a backend with a long press delay on a fresh root element, and returns a spy on its dragStart event. */
  const setupLongPress = () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    onTestFinished(() => root.remove())
    const manager = {
      getActions: () => ({}),
      getMonitor: () => ({ isDragging: () => false }),
    } as unknown as DragDropManager
    backend = new TouchBackendImpl(manager, { window }, { rootElement: root, delayTouchStart, touchSlop })
    backend.setup()
    const dragStart = vi.fn()
    root.addEventListener('dragStart', dragStart)
    return { root, dragStart }
  }

  /** Dispatches a single-finger touch event at the given client coordinates. */
  const touch = (root: HTMLElement, type: 'touchstart' | 'touchmove', clientX: number, clientY: number) => {
    const point = { clientX, clientY }
    root.dispatchEvent(
      Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
        targetTouches: [point],
        touches: [point],
      }),
    )
  }

  it('starts the long press when the finger holds still', () => {
    const { root, dragStart } = setupLongPress()

    touch(root, 'touchstart', 100, 100)
    vi.advanceTimersByTime(delayTouchStart)
    vi.advanceTimersToNextFrame()

    expect(dragStart).toHaveBeenCalledOnce()
  })

  it('still starts the long press when the finger moves within the touch slop', () => {
    const { root, dragStart } = setupLongPress()

    touch(root, 'touchstart', 100, 100)
    touch(root, 'touchmove', 105, 105)
    vi.advanceTimersByTime(delayTouchStart)
    vi.advanceTimersToNextFrame()

    expect(dragStart).toHaveBeenCalledOnce()
  })

  // https://github.com/cybersemics/em/issues/5973
  it('measures the touch slop from where the press began rather than from the first move', () => {
    const { root, dragStart } = setupLongPress()

    // the browser suppresses moves within its own slop, so the first move the page sees is already past ours
    touch(root, 'touchstart', 100, 100)
    touch(root, 'touchmove', 120, 100)
    vi.advanceTimersByTime(delayTouchStart)
    vi.advanceTimersToNextFrame()

    expect(dragStart).not.toHaveBeenCalled()
  })

  // https://github.com/cybersemics/em/issues/5973
  it('lets a move handled after the delay expires but before the next frame cancel the long press', () => {
    const { root, dragStart } = setupLongPress()

    // touch moves are dispatched at the start of a frame, so a move received before the deadline can be handled after the timer
    touch(root, 'touchstart', 100, 100)
    vi.advanceTimersByTime(delayTouchStart)
    touch(root, 'touchmove', 120, 100)
    vi.advanceTimersToNextFrame()

    expect(dragStart).not.toHaveBeenCalled()
  })
})
