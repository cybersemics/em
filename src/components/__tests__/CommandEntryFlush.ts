import { fireEvent, render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import noteCommand from '../../commands/note'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import head from '../../util/head'
import PanelCommand from '../CommandCenter/PanelCommand'

beforeEach(createTestApp)
afterEach(async () => {
  await cleanupTestApp()
})

/** Returns the current cursor thought value. */
const cursorValue = () => {
  const state = store.getState()
  return state.cursor ? getThoughtById(state, head(state.cursor))?.value : null
}

/** Applies an input event that leaves a throttled edit pending. */
const queuePendingEdit = () => {
  const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement
  editable.innerHTML = 'ab'
  fireEvent.input(editable, { inputType: 'insertText', data: 'b' })
}

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a toolbar command', async () => {
  await dispatch([newThought({ value: 'a' })])

  queuePendingEdit()

  await click('[data-testid="toolbar-icon"][aria-label="Note"]')
  await act(vi.runOnlyPendingTimersAsync)

  expect(cursorValue()).toBe('ab')
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a formatSelection command from the toolbar', async () => {
  await dispatch([newThought({ value: 'a' })])

  queuePendingEdit()

  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')
  await act(vi.runOnlyPendingTimersAsync)

  expect(cursorValue()).toBe('<b>ab</b>')
})

// A picker swatch dispatches its action creator directly, so the next two cover the flushes in formatSelectionColor
// and formatLetterCase rather than the one in executeCommandWithMulticursor. The edit is queued after the picker is
// opened, since opening it is itself a toolbar command that flushes.
// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before applying a color from the picker', async () => {
  await dispatch([newThought({ value: 'a' })])

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  queuePendingEdit()

  await click('[aria-label="text color swatches"] [aria-label="blue"]')
  await act(vi.runOnlyPendingTimersAsync)

  expect(cursorValue()).toBe('<font color="#00c7e6">ab</font>')
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before applying letter case from the picker', async () => {
  await dispatch([newThought({ value: 'a' })])

  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')

  queuePendingEdit()

  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')
  await act(vi.runOnlyPendingTimersAsync)

  expect(cursorValue()).toBe('AB')
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a desktop command universe command', async () => {
  await dispatch([newThought({ value: 'a' })])

  queuePendingEdit()

  await act(async () => {
    store.dispatch(desktopCommandUniverse())
  })
  await act(vi.runOnlyPendingTimersAsync)

  const searchInput = document.querySelector('input[placeholder="Search for a command"]') as HTMLInputElement
  fireEvent.input(searchInput, { target: { value: 'Note' } })
  fireEvent.keyDown(window, { key: 'Enter' })
  await act(vi.runOnlyPendingTimersAsync)

  expect(cursorValue()).toBe('ab')
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a command center command', async () => {
  await dispatch([newThought({ value: 'a' })])

  queuePendingEdit()

  const { container } = render(
    createElement(Provider, {
      store,
      children: createElement(PanelCommand, {
        command: noteCommand,
        size: 'small',
      }),
    }),
  )

  const noteButton = container.querySelector(`[aria-label="${noteCommand.label}"]`) as HTMLElement
  fireEvent.click(noteButton)
  await act(vi.runOnlyPendingTimersAsync)

  expect(cursorValue()).toBe('ab')
})
