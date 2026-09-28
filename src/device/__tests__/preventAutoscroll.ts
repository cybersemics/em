import preventAutoscroll, { PREVENT_AUTOSCROLL_TIMEOUT, preventAutoscrollEnd } from '../preventAutoscroll'

vi.mock('../../browser', async () => {
  const actual = await vi.importActual<typeof import('../../browser')>('../../browser')
  return { ...actual, isTouch: true }
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
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
