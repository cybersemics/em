import _ from 'lodash'
import storage from '../storage'
import storeSession from '../storeSession'

/** Regression tests for the intermittent CI failure `ReferenceError: localStorage is not defined` (#3345).
 *
 * Root cause: Vitest's jsdom environment installs `localStorage`/`sessionStorage` as own properties on
 * the global object and deletes them during teardown at the end of each test file
 * (`keys.forEach(key => delete global[key])`). Module-scoped throttled/debounced writers
 * (e.g. saveJumpHistory, storageCache setters, getEmThought's saveCache) schedule real timers that can
 * fire AFTER teardown, at which point the bare `localStorage`/`sessionStorage` identifiers used in
 * util/storage.ts and util/storeSession.ts are unbound and throw a ReferenceError.
 *
 * These tests simulate teardown by deleting the own global property, then exercise the bare-identifier
 * code paths, asserting they no longer throw thanks to the persistent fallback installed in setupTests.js.
 */
describe('storage post-teardown resilience (#3345)', () => {
  it('storage.setItem/getItem do not throw after localStorage global is torn down', () => {
    // simulate vitest jsdom environment teardown deleting the own global property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).localStorage

    expect(() => storage.setItem('teardown-key', 'value')).not.toThrow()
    expect(() => storage.getItem('teardown-key')).not.toThrow()
    expect(() => storage.removeItem('teardown-key')).not.toThrow()
  })

  it('storeSession do not throw after sessionStorage global is torn down', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).sessionStorage

    expect(() => storeSession.setItem('teardown-key', 'value')).not.toThrow()
    expect(() => storeSession.getItem('teardown-key')).not.toThrow()
    expect(() => storeSession.removeItem('teardown-key')).not.toThrow()
  })

  it('a leaked throttled storage write firing after teardown does not throw', () => {
    // Mirror the real leak: module-scoped `_.throttle` writers (saveJumpHistory, storageCache setters,
    // getEmThought's saveCache) schedule a timer that writes via storage.setItem. Here the timer is
    // scheduled, then the localStorage global is deleted (as vitest teardown does), then the timer fires.
    vi.useFakeTimers()
    try {
      const flush = _.throttle(() => storage.setItem('leaked', 'value'), 1000, { leading: false })
      flush()

      // simulate teardown deleting the own global property while the timer is still pending
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).localStorage

      // fire the pending timer post-teardown; without the fallback this throws ReferenceError
      expect(() => vi.runAllTimers()).not.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })
})
