import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { AlertText, TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import getBulletByContext from '../../test-helpers/queries/getBulletByContext'

/*
  On macOS a Ctrl+click is a left click that opens the native context menu (#6406). Safari 27 dispatches its contextmenu
  before its mousedown, so ending the press on contextmenu is not enough: the mousedown that follows would start a press
  that nothing ends, since the menu takes the mouseup.
*/

vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isMac: true }
})

beforeEach(async () => {
  await createTestApp()
})

afterEach(async () => {
  await cleanupTestApp()
})

it('a Ctrl+click on a bullet does not activate drag and drop when its mousedown follows the context menu', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await act(async () => {
    fireEvent.contextMenu(bullet, { button: 0, ctrlKey: true })
    fireEvent.mouseDown(bullet, { button: 0, ctrlKey: true })
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})
