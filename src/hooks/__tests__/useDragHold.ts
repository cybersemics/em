import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { AlertText, TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import getBulletByContext from '../../test-helpers/queries/getBulletByContext'

/*
  On desktop a native context menu takes the mouseup that would end a press on a bullet, so before #6406 a press that
  opened one was never ended: the bullet stayed highlighted, and the caret was no longer placed on new thoughts. JSDOM
  runs as desktop. Ctrl+click on macOS is covered in useDragHold.mac.ts.
*/

beforeEach(async () => {
  await createTestApp()
})

afterEach(async () => {
  await cleanupTestApp()
})

it('a left click on a bullet that opens a context menu does not activate drag and drop', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await act(async () => {
    fireEvent.mouseDown(bullet, { button: 0, ctrlKey: true })
    fireEvent.contextMenu(bullet, { button: 0, ctrlKey: true })
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('a long press on a bullet ends without selecting the thought when a context menu opens', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await act(async () => {
    fireEvent.mouseDown(bullet, { button: 0 })
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()

  await act(async () => {
    fireEvent.contextMenu(bullet, { button: 2 })
  })
  await act(vi.runAllTimersAsync)

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
  expect(hasMulticursor(store.getState())).toBe(false)
})
