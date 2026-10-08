import { WEBSOCKET_TIMEOUT } from '../../constants'
import { resetStores } from '../ministore'
import offlineStatusStore, { init } from '../offlineStatusStore'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// https://github.com/cybersemics/em/issues/5256
it('does not move off the status a reset restores until the connection sequence is armed again', () => {
  init()

  resetStores()
  vi.advanceTimersByTime(1000 + WEBSOCKET_TIMEOUT)

  expect(offlineStatusStore.getState()).toBe('preconnecting')
})

it('goes from preconnecting through connecting to offline', () => {
  init()

  vi.advanceTimersByTime(1000)
  expect(offlineStatusStore.getState()).toBe('connecting')

  vi.advanceTimersByTime(WEBSOCKET_TIMEOUT)
  expect(offlineStatusStore.getState()).toBe('offline')
})
