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
