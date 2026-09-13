import _ from 'lodash'
import { resetStores } from '../../stores/ministore'
import cancelOnReset from '../cancelOnReset'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// https://github.com/cybersemics/em/issues/5257
it('cancelAll stops a pending trailing call from firing', () => {
  const f = vi.fn()
  const throttled = cancelOnReset(_.throttle(f, 100, { leading: false }))

  throttled()
  cancelOnReset.cancelAll()
  vi.advanceTimersByTime(200)

  expect(f).not.toHaveBeenCalled()
})

it('resetStores cancels a registered pending call', () => {
  const f = vi.fn()
  const debounced = cancelOnReset(_.debounce(f, 100))

  debounced()
  resetStores()
  vi.advanceTimersByTime(200)

  expect(f).not.toHaveBeenCalled()
})

it('cancelAll reopens the window of a leading-edge throttle', () => {
  const f = vi.fn()
  const throttled = cancelOnReset(_.throttle(f, 100, { leading: true, trailing: false }))

  throttled()
  cancelOnReset.cancelAll()
  throttled()

  expect(f).toHaveBeenCalledTimes(2)
})

it('returns the wrapper unchanged', () => {
  const throttled = _.throttle(vi.fn(), 100)

  expect(cancelOnReset(throttled)).toBe(throttled)
})
