import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import SimplePath from '../../@types/SimplePath'
import { editThoughtActionCreator as editThought } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleNoteActionCreator as toggleNote } from '../../actions/toggleNote'
import { HOME_TOKEN } from '../../constants'
import findDescendant from '../../selectors/findDescendant'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('basic note', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - =note
          - foo`,
    }),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('foo')
  expect(element)
})

it('re-render note when =note subthought value changes', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - =note
          - foo`,
    }),
    setCursor(['a', '=note', 'foo']),
    (dispatch, getState) =>
      dispatch(
        editThought({
          oldValue: 'foo',
          newValue: 'bar',
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('bar')
  expect(element)
})

it('render note when subthought is edited from non-attribute', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - note
          - foo`,
    }),
    setCursor(['a', 'note']),
    (dispatch, getState) =>
      dispatch(
        editThought({
          oldValue: 'note',
          newValue: '=note',
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('foo')
  expect(element)
})

it('render note when subthought is edited from non-note attribute', async () => {
  await dispatch([
    importText({
      text: `
      - a
        - =test
          - foo`,
    }),
    setCursor(['a', '=test']),
    (dispatch, getState) =>
      dispatch(
        editThought({
          oldValue: '=test',
          newValue: '=note',
          path: getState().cursor as SimplePath,
        }),
      ),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  const element = screen.getByText('foo')
  expect(element)
})

/** Tests for path reference notes. */
it('renders a path-based note with correct content', async () => {
  await dispatch([
    importText({
      text: `
      - x
        - =note
          - =path
            - a
        - a
          - Test`,
    }),
    // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    setCursor(null),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // The content should appear twice: once in the original thought and once in the note
  const contentInstances = screen.getAllByText('Test')

  // We expect two instances: one from the original thought and one from the note
  expect(contentInstances).toHaveLength(2)
})

it('updates target thought when path-based note is edited', async () => {
  await dispatch([
    importText({
      text: `
      - x
        - =note
          - =path
            - a
        - a
          - Test`,
    }),
    // Focus the note for editing
    setCursor(['x']),
    toggleNote(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // Find the note elements - we expect two instances of the text
  const noteElements = screen.getAllByText('Test')

  // Target the first note element, even though both share the same text as it is the one that is part of the note
  const noteElement = noteElements[0]

  // Simulate editing the note
  await act(async () => {
    // Focus the element first
    fireEvent.focus(noteElement)

    // Clear the content and type new text
    fireEvent.input(noteElement, { target: { innerHTML: 'Updated Test via ui note' } })
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Check that the target thought content was updated
  const state = store.getState()
  const xId = findDescendant(state, HOME_TOKEN, 'x')
  const aId = xId ? findDescendant(state, xId, 'a') : null
  const originalContent = aId ? findDescendant(state, aId, 'Test') : null
  const updatedContent = aId ? findDescendant(state, aId, 'Updated Test via ui note') : null

  // Original content should be gone
  expect(originalContent).toBeNull()

  // Updated content should exist
  expect(updatedContent).toBeTruthy()

  // Verify both instances of the text are updated.
  const updatedElements = screen.getAllByText('Updated Test via ui note')
  expect(updatedElements).toHaveLength(2)
})

it('creates missing thought if it does not exist when toggling note', async () => {
  await dispatch([
    importText({
      text: `
      - x
        - =note
          - =path
            - a`,
    }),
    // Focus the parent thought
    setCursor(['x']),
    toggleNote(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // Check that the non-existent target was created
  const state = store.getState()
  const xId = findDescendant(state, HOME_TOKEN, 'x')
  const targetId = xId ? findDescendant(state, xId, 'a') : null

  expect(targetId).toBeTruthy()
})

it('deletes both note structure and target thought when note is deleted via user interaction', async () => {
  await dispatch([
    importText({
      text: `
        - x
          - =note
            - =path
              - a
          - a
            - Test`,
    }),
    // Focus the parent thought and toggle to focus the note
    setCursor(['x']),
    toggleNote(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // Find and verify the note element exists
  const noteElements = screen.getAllByText('Test')

  // Focus the note element
  const noteElement = noteElements[0]
  await act(async () => {
    fireEvent.focus(noteElement)
  })

  // Clear the note content first
  await act(async () => {
    fireEvent.input(noteElement, { target: { innerHTML: '' } })
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Now simulate pressing Backspace on the empty note to delete it
  await act(async () => {
    fireEvent.keyDown(noteElement, { key: 'Backspace' })
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Verify both the note and the target thought are gone
  const state = store.getState()
  const xId = findDescendant(state, HOME_TOKEN, 'x')
  const noteId = xId ? findDescendant(state, xId, '=note') : null
  const targetId = xId ? findDescendant(state, xId, 'a') : null

  // The note structure should be deleted
  expect(noteId).toBeNull()

  // The target thought should also be deleted
  expect(targetId).toBeNull()
})

it('archives both note and target when archiving a note via user interaction', async () => {
  await dispatch([
    importText({
      text: `
          - x
            - =note
              - =path
                - a
            - a
              - Test`,
    }),
    // Focus the note for editing
    setCursor(['x']),
    toggleNote(),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  // Find the note elements
  const noteElements = screen.getAllByText('Test')
  const noteElement = noteElements[0]

  // Focus the note element
  await act(async () => {
    fireEvent.focus(noteElement)
  })

  // Simulate keyboard shortcut for archive
  await act(async () => {
    fireEvent.keyDown(noteElement, {
      key: 'Backspace',
      shiftKey: true,
      metaKey: true,
    })
  })

  await act(vi.runOnlyPendingTimersAsync)

  // Verify the note is in the archive
  const state = store.getState()
  const xId = findDescendant(state, HOME_TOKEN, 'x')
  const archiveId = xId ? findDescendant(state, xId, '=archive') : null

  // Original note and target thought should be removed from main context
  const originalNoteId = xId ? findDescendant(state, xId, '=note') : null
  const originalTargetId = xId ? findDescendant(state, xId, 'a') : null
  expect(originalNoteId).toBeNull()
  expect(originalTargetId).toBeNull()

  // Both note and target should now be in the archive
  const archivedNoteId = archiveId ? findDescendant(state, archiveId, '=note') : null
  const archivedTargetId = archiveId ? findDescendant(state, archiveId, 'a') : null

  expect(archivedNoteId).toBeTruthy()
  expect(archivedTargetId).toBeTruthy()
})
