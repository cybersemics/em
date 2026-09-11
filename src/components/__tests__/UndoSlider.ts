import { fireEvent } from '@testing-library/react'
import { act } from 'react'
import { indentActionCreator as indent } from '../../actions/indent'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { HOME_TOKEN } from '../../constants'
import * as copyModule from '../../device/copy'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

vi.mock('../../device/copy')

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Creates a, b, and c, indents c and then b, and opens the undo slider. */
const arrange = async () => {
  await dispatch([
    newThought({}),
    editThought([''], 'a'),
    newThought({}),
    editThought([''], 'b'),
    newThought({}),
    editThought([''], 'c'),
    indent(),
    setCursor(['b']),
    indent(),
    // Open the slider explicitly rather than toggling it, since clear does not reset showUndoSlider between tests.
    toggleDropdown({ dropDownType: 'undoSlider', value: true }),
  ])
  await act(vi.runOnlyPendingTimersAsync)
}

/** Returns the handle element of the undo slider with the given aria-label. */
const handle = (label: 'undo slider start' | 'undo slider end') => {
  const el = document.querySelector(`[aria-label="${label}"]`)
  if (!el) throw new Error(`Element not found for aria-label: ${label}`)
  return el
}

/** Presses an arrow key on a handle. With the slider reversed, the left arrow moves a handle back in time. */
const press = async (label: 'undo slider start' | 'undo slider end', key: 'ArrowLeft' | 'ArrowRight') => {
  await act(async () => {
    fireEvent.keyDown(handle(label), { key, keyCode: key === 'ArrowLeft' ? 37 : 39 })
  })
}

it('move the thoughtspace to the point in time under the start handle', async () => {
  await arrange()

  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b`)
  expect(handle('undo slider start').textContent).toBe('New Thought')
  expect(handle('undo slider end').textContent).toBe('Indent')
})

it('move the thoughtspace to the point in time under the end handle and keep the start handle', async () => {
  await arrange()
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')

  await press('undo slider end', 'ArrowLeft')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
    - c`)
  expect(handle('undo slider start').textContent).toBe('New Thought')
  expect(handle('undo slider end').textContent).toBe('Indent')
})

it('keep the end handle at least one step after the start handle', async () => {
  await arrange()
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')

  await press('undo slider end', 'ArrowLeft')
  await press('undo slider end', 'ArrowLeft')
  await press('undo slider end', 'ArrowLeft')

  // the end handle stops one step after the start handle, where c has been created but not yet indented
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
})

it('stop the start handle one step before the end handle', async () => {
  await arrange()
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider end', 'ArrowLeft')

  await press('undo slider start', 'ArrowRight')
  await press('undo slider start', 'ArrowRight')

  // the start handle moves one step forward, where c has been created but not yet indented, and then stops before the end handle
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
})

it('move the thoughtspace to a handle when it is tapped', async () => {
  await arrange()
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider end', 'ArrowLeft')

  await click('[aria-label="undo slider start"]')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b`)

  await click('[aria-label="undo slider end"]')

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b
    - c`)
})

it('keep the handles where they were when the slider is closed and reopened', async () => {
  await arrange()
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider end', 'ArrowLeft')

  await click('[data-testid="toolbar-icon"][aria-label="Toggle Undo Slider"]')
  await act(vi.runAllTimersAsync)

  // the slider is unmounted while it is closed, which is what discarded the handles
  expect(document.querySelector('[aria-label="undo slider start"]')).toBeNull()

  await click('[data-testid="toolbar-icon"][aria-label="Toggle Undo Slider"]')
  await act(vi.runAllTimersAsync)

  expect(handle('undo slider start').getAttribute('aria-valuenow')).toBe('3')
  expect(handle('undo slider end').getAttribute('aria-valuenow')).toBe('1')
})

it('copy the steps to reproduce the actions between the start and the end', async () => {
  await arrange()
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider end', 'ArrowLeft')

  await click('[aria-label="copy steps to reproduce"]')

  expect(copyModule.default).toHaveBeenCalledWith(`## Steps to Reproduce

\`\`\`
- a
- b
\`\`\`

1. Set the cursor on \`b\`.
2. New Thought \`c\`.
3. Indent.

## Current Behavior

\`\`\`
- a
- b
  - c
\`\`\`

## Expected Behavior


`)
})

it('keep an edit that has not been committed yet when the slider moves', async () => {
  await dispatch([
    toggleDropdown({ dropDownType: 'undoSlider', value: false }),
    newThought({ value: 'a' }),
    newThought({ value: 'b' }),
    setCursor(['b']),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  // Type into the thought, leaving the throttled edit pending. Editing dispatches editThought on a throttle, so the edit is
  // not in the history yet.
  await act(async () => {
    fireEvent.input((await findThoughtByText('b'))!, { target: { innerHTML: 'bb' } })
  })
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - b`)

  // Open the slider without a click and without advancing the throttle, as tapping the toolbar on a touch device does: the
  // toolbar does not flush pending edits and does not blur the editable.
  await act(async () => {
    store.dispatch(toggleDropdown({ dropDownType: 'undoSlider', value: true }))
  })

  // move the start handle back a step and forward again
  await press('undo slider start', 'ArrowLeft')
  await press('undo slider start', 'ArrowRight')
  await act(vi.runAllTimersAsync)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
  - bb`)
})
