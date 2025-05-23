import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import SimplePath from '../../@types/SimplePath'
import { editThoughtActionCreator as editThought } from '../../actions/editThought'
import { importTextActionCreator as importText } from '../../actions/importText'
import { toggleNoteActionCreator as toggleNote } from '../../actions/toggleNote'
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

describe('Path Reference Notes', () => {
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

    // Verify both the note and original thought now show the updated text
    const updatedElements = screen.getAllByText('Updated Test via ui note')
    expect(updatedElements).toHaveLength(2)

    // Verify the original text is no longer present
    expect(screen.queryByText('Test')).toBeNull()
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
      setCursor(['x']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Simulate keyboard shortcut for hidden thoughts
    await act(async () => {
      fireEvent.keyDown(document.body, {
        key: 'h',
        shiftKey: true,
        altKey: true,
      })
    })

    await act(vi.runOnlyPendingTimersAsync)

    // Verify that 'a' thought doesn't exist yet in the DOM
    // Note: we only see 'a' as a value inside =path, not as a sibling thought
    const aElements = screen.getAllByText('a')
    expect(aElements.length).toBe(1) // Only the one inside =path

    // Toggle hidden thoughts back to normal view
    await act(async () => {
      fireEvent.keyDown(document.body, {
        key: 'h',
        shiftKey: true,
        altKey: true,
      })
    })

    await act(vi.runOnlyPendingTimersAsync)

    // Focus the parent thought and toggle its note
    await dispatch([setCursor(['x']), toggleNote()])

    await act(vi.runOnlyPendingTimersAsync)

    // Verify the note editor is visible
    const noteEditor = document.querySelector('[aria-label="note-editable"]')
    expect(noteEditor).toBeInTheDocument()

    // Verify the 'a' thought was created and is visible in the DOM
    expect(screen.getByText('a')).toBeInTheDocument()

    // Verify that the note is empty (since 'a' was just created)
    expect(noteEditor?.innerHTML).toBe('')

    // Test that editing the note updates the newly created thought
    await act(async () => {
      fireEvent.focus(noteEditor!)
      fireEvent.input(noteEditor!, { target: { innerHTML: 'New content' } })
    })

    await act(vi.runOnlyPendingTimersAsync)

    // Verify the content appears in both places: in the note and in the actual thought
    const contentElements = screen.getAllByText('New content')
    expect(contentElements).toHaveLength(2)
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

    // Verify original note content is no longer visible
    expect(screen.queryByText('Test')).toBeNull()

    // Show hidden thoughts to make the =archive visible in the UI
    await act(async () => {
      fireEvent.keyDown(document.body, {
        key: 'h',
        shiftKey: true,
        altKey: true,
      })
    })
    await act(vi.runOnlyPendingTimersAsync)

    // verify the archived content exists inside =archive
    expect(screen.getAllByText('a')).toHaveLength(2)
  })
})

describe('Children Notes', () => {
  it('=children/=note should allow a note to be defined for all children', async () => {
    await dispatch([
      importText({
        text: `
        - x
          - =children
            - =note
              - Test
          - a
          - b
          - c`,
      }),
      // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
      setCursor(null),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const contentInstances = screen.getAllByText('Test')

    // We expect three instances: Test rendered as note in all of the children
    expect(contentInstances).toHaveLength(3)
  })

  it('=children/=note/=path should render a note if the =path thought (e.g., Year) exists as a nested thought within each child of x.', async () => {
    await dispatch([
      importText({
        text: `
        - x
          - =children
            - =note
              - =path
                - Year
          - a
            - Year
              - 2009
          - b
           - Year
              - 2010
          - c
           - year
              - 2011`,
      }),
      // this will hide the meta attribute, so if the note value can be selected on the screen it must be rendered
      setCursor(null),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const year1 = screen.getAllByText('2009')
    const year2 = screen.getAllByText('2010')
    const year3 = screen.queryByText('2011')

    // We expect each year to be rendered in the note once: as a note value
    expect(year1).toHaveLength(1)
    expect(year2).toHaveLength(1)
    expect(year3).toBeNull()
  })

  it('should update the target thought when the note is edited and vice versa', async () => {
    await dispatch([
      importText({
        text: `
        - x
          - =children
            - =note
              - =path
                - Year
          - a
            - Year
              - 2009
          - b
           - Year
              - 2010
          - c
           - Year
              - 2011`,
      }),
      // Focus the note for editing
      setCursor(['x', 'a']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Find the note elements - we expect two instances of the text
    const noteElements = screen.getAllByText('2009')

    // Target the first note element, even though both share the same text as it is the one that is part of the note
    const noteElement = noteElements[0]

    // Simulate editing the note
    await act(async () => {
      // Focus the element first
      fireEvent.focus(noteElement)

      // Clear the content and type new text
      fireEvent.input(noteElement, { target: { innerHTML: '2025' } })
    })

    await act(vi.runOnlyPendingTimersAsync)

    // Verify both the note and original thought now show the updated text
    const updatedElements = screen.getAllByText('2025')
    expect(updatedElements).toHaveLength(2)

    // Verify the original year is no longer present
    expect(screen.queryByText('2009')).toBeNull()
  })
})
