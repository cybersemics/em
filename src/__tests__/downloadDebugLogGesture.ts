import { act } from 'react'
import { GestureResponderEvent } from 'react-native'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../actions/toggleUserSetting'
import { handleGestureEnd } from '../commands'
import { Settings } from '../constants'
import download from '../device/download'
import createTestApp, { cleanupTestApp } from '../test-helpers/createTestApp'
import dispatch from '../test-helpers/dispatch'

vi.mock('../device/download')

beforeEach(async () => {
  vi.mocked(download).mockClear()
  await createTestApp()
})
afterEach(cleanupTestApp)

it('download the debug log with the secret gesture →↓←↓↑ when Debug Logging is on', async () => {
  await dispatch(toggleUserSetting({ key: Settings.debugCrashLog, value: true }))
  await act(vi.runOnlyPendingTimersAsync)

  act(() => handleGestureEnd({ sequence: 'rdldu', e: {} as GestureResponderEvent }))

  expect(download).toHaveBeenCalledWith(
    expect.stringContaining('--- state.thoughts:'),
    expect.stringMatching(/^em-debug-log-\d+\.txt$/),
  )
})

it('ignore the secret gesture →↓←↓↑ when Debug Logging is off', async () => {
  act(() => handleGestureEnd({ sequence: 'rdldu', e: {} as GestureResponderEvent }))

  expect(download).not.toHaveBeenCalled()
})
