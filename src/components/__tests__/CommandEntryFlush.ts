import { fireEvent } from '@testing-library/react'
import { act } from 'react'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import head from '../../util/head'

beforeEach(createTestApp)
afterEach(async () => {
  await cleanupTestApp()
})

// Every case drives Bold, whose result a stale edit would overwrite. A command that does not change thought text (e.g.
// Note) leaves the same value behind whether or not anything flushed, so it cannot demonstrate the flush at all.
// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a toolbar command', async () => {
  await dispatch([newThought({ value: 'a' })])

  const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement
  editable.innerHTML = 'ab'
  fireEvent.input(editable, { inputType: 'insertText', data: 'b' })

  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')
  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  expect(getThoughtById(state, head(state.cursor!))!.value).toBe('<b>ab</b>')
})

// A picker swatch dispatches its action creator directly, so the next two cover the flushes in formatSelectionColor
// and formatLetterCase rather than the one in executeCommandWithMulticursor. The edit is queued after the picker is
// opened, since opening it is itself a toolbar command that flushes.
// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before applying a color from the picker', async () => {
  await dispatch([newThought({ value: 'a' })])

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement
  editable.innerHTML = 'ab'
  fireEvent.input(editable, { inputType: 'insertText', data: 'b' })

  await click('[aria-label="text color swatches"] [aria-label="blue"]')
  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  expect(getThoughtById(state, head(state.cursor!))!.value).toBe('<font color="#00c7e6">ab</font>')
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before applying letter case from the picker', async () => {
  await dispatch([newThought({ value: 'a' })])

  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')

  const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement
  editable.innerHTML = 'ab'
  fireEvent.input(editable, { inputType: 'insertText', data: 'b' })

  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')
  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  expect(getThoughtById(state, head(state.cursor!))!.value).toBe('AB')
})

// Neither palette is covered here, because neither can lose an edit. Opening the Command Universe focuses its search
// input, which blurs the editable and flushes through Editable's onBlur. The Command Center's commands are hard-coded
// in CommandCenter.tsx and none of them changes thought text, so there is nothing a stale edit could overwrite. Both
// reach commands through the same guard the toolbar case above exercises.
