import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../../actions/toggleUserSetting'
import { Settings } from '../../constants'
import download from '../../device/download'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

vi.mock('../../device/download')

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('download the debug log as a text file', async () => {
  await dispatch([toggleUserSetting({ key: Settings.debugCrashLog, value: true }), showModal({ id: 'settings' })])

  await act(vi.runOnlyPendingTimersAsync)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Download debug log' }))
  })

  expect(download).toHaveBeenCalledWith(
    expect.stringContaining('--- state.thoughts:'),
    expect.stringMatching(/^em-debug-log-\d+\.txt$/),
  )
})
