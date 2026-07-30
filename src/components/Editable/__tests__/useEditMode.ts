import { act } from 'react'
import { importTextActionCreator as importText } from '../../../actions/importText'
import store from '../../../stores/app'
import createTestApp, { cleanupTestApp } from '../../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import windowEvent from '../../../test-helpers/windowEvent'

/** Captures the native keyboard plugin calls made by the app. */
const keyboardShow = vi.hoisted(() => vi.fn())

// Emulate the Android Capacitor app, where the WebView does not raise the native keyboard when an editable is
// focused programmatically.
vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      getPlatform: () => 'android',
      isNativePlatform: () => true,
      isPluginAvailable: () => true,
    },
  }
})

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: () => Promise.resolve({ remove: () => {} }),
    hide: () => Promise.resolve(),
    removeAllListeners: () => Promise.resolve(),
    show: keyboardShow,
  },
}))

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setOverlaysWebView: () => Promise.resolve(),
    setStyle: () => Promise.resolve(),
  },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}))

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// https://github.com/cybersemics/em/issues/4686
it.skip('opens the virtual keyboard when Clear Thought activates edit mode', async () => {
  await act(async () => {
    store.dispatch([importText({ text: '- Hello World' }), setCursor(['Hello World'])])
  })
  await act(vi.runAllTimersAsync)

  keyboardShow.mockClear()

  // Clear Thought
  act(() => {
    windowEvent('keydown', { key: 'c', altKey: true, shiftKey: true, metaKey: true })
  })
  await act(vi.runAllTimersAsync)

  expect(keyboardShow).toHaveBeenCalled()
})
