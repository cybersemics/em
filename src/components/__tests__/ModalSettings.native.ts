import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../../actions/toggleUserSetting'
import { Settings } from '../../constants'
import share from '../../device/share'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

// Emulate the native iOS/Android app, whose WebView has no download manager and so silently ignores the anchor
// click that download() performs. See DebugLogging in Settings.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return {
    ...actual,
    isCapacitor: () => true,
  }
})

// The native app's virtual keyboard handler registers Capacitor Keyboard listeners on init, which reject as
// UNIMPLEMENTED against the web platform the test actually runs on.
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: () => Promise.resolve({ remove: () => {} }),
    hide: () => Promise.resolve(),
    removeAllListeners: () => Promise.resolve(),
    show: () => Promise.resolve(),
  },
}))

vi.mock('../../device/share')

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('share the debug log through the native share sheet in the app, where there is no download manager', async () => {
  await dispatch([toggleUserSetting({ key: Settings.debugCrashLog, value: true }), showModal({ id: 'settings' })])

  await act(vi.runOnlyPendingTimersAsync)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Share debug log' }))
  })

  expect(share).toHaveBeenCalledWith({
    text: expect.stringContaining('--- state.thoughts:'),
    title: expect.stringMatching(/^em-debug-log-\d+\.txt$/),
  })
})
