import { resetStores } from '../../stores/ministore'
import preventAutoscroll, {
  PREVENT_AUTOSCROLL_TIMEOUT,
  isPreventAutoscrollInProgress,
  preventAutoscrollEnd,
} from '../preventAutoscroll'

// preventAutoscroll does nothing on desktop, which is what jsdom reports.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

// https://github.com/cybersemics/em/issues/5251
it('restores the held element and cancels its timer when the stores are reset', () => {
  const el = document.createElement('div')
  el.style.paddingBottom = '3px'
  document.body.appendChild(el)

  preventAutoscroll(el)
  expect(el.hasAttribute('data-prevent-autoscroll')).toBe(true)

  resetStores()

  expect(el.hasAttribute('data-prevent-autoscroll')).toBe(false)
  expect(el.style.paddingBottom).toBe('3px')
  expect(isPreventAutoscrollInProgress()).toBe(false)
  el.remove()
})

it('restores the padded element after the timeout even when another element ends first', () => {
  const padded = document.createElement('div')
  const other = document.createElement('div')
  document.body.append(padded, other)

  preventAutoscroll(padded)
  expect(padded.getAttribute('data-prevent-autoscroll')).toBe('true')

  // The previously focused thought's focus handler queues a cleanup for itself, which can run after preventAutoscroll
  // has already padded the next thought. It must not cancel the padded element's cleanup. (#4101)
  preventAutoscrollEnd(other)
  vi.advanceTimersByTime(PREVENT_AUTOSCROLL_TIMEOUT)

  expect(padded.style.paddingBottom).toBe('')
  expect(padded.getAttribute('data-prevent-autoscroll')).toBeNull()
})
