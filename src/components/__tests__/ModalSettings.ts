import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import fontSizeUp from '../../actions/fontSizeUp'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../../actions/toggleUserSetting'
import { DEFAULT_FONT_SIZE, Settings } from '../../constants'
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

it('shows a font size changed while Settings is open, e.g. from Command + = (#6198)', async () => {
  await dispatch(showModal({ id: 'settings' }))
  await act(vi.runOnlyPendingTimersAsync)

  await dispatch(fontSizeUp())

  expect(screen.getByRole('spinbutton')).toHaveValue(DEFAULT_FONT_SIZE + 1)
})

it('keeps a font size typed out of range until the input is left, without applying it', async () => {
  await dispatch(showModal({ id: 'settings' }))
  await act(vi.runOnlyPendingTimersAsync)
  const input = screen.getByRole('spinbutton')

  await act(async () => {
    fireEvent.change(input, { target: { value: '99' } })
  })
  expect(input).toHaveValue(99)

  await act(async () => {
    fireEvent.focusOut(input)
  })
  expect(input).toHaveValue(DEFAULT_FONT_SIZE)
})
