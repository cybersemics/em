import { fireEvent, screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { redoActionCreator as redo } from '../../actions/redo'
import { toggleNoteActionCreator as toggleNote } from '../../actions/toggleNote'
import { undoActionCreator as undo } from '../../actions/undo'
import { HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import exportContext from '../../selectors/exportContext'
import { getChildrenSorted } from '../../selectors/getChildren'
import store from '../../stores/app'
import editableSyncStore from '../../stores/editableSyncStore'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

describe('=note', () => {
  // https://github.com/cybersemics/em/issues/5084
  test.each([
    ['plain whitespace', '  hello  world  ', 'hello  world'],
    ['formatted whitespace', '<b>  hello <i>world  </i></b>', '<b>hello <i>world</i></b>'],
    ['only whitespace', '   ', ''],
  ])('trims %s only after the note blurs', async (_description, input, expected) => {
    await dispatch([importText({ text: '- a\n  - =note\n    - seed' }), setCursor(['a']), toggleNote()])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')

    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: input } })
    })
    expect(noteEditor.innerHTML).toBe(input)

    await act(async () => {
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe(expected)

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toContain(`<li>${expected}</li>`)
  })

  test('preserves internal whitespace and line breaks when a note blurs', async () => {
    await dispatch([importText({ text: '- a\n  - =note\n    - seed' }), setCursor(['a']), toggleNote()])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: '<b>one&nbsp; two</b><br>three' } })
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe('<b>one&nbsp; two</b><br>three')
  })

  test('undoes and redoes trimming without losing the note edit', async () => {
    await dispatch([importText({ text: '- a\n  - =note\n    - seed' }), setCursor(['a']), toggleNote()])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: '  hello  ' } })
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe('hello')
    await act(async () => {
      fireEvent.keyDown(document, { key: 'z', metaKey: true })
      await vi.runOnlyPendingTimersAsync()
    })
    expect(screen.getByLabelText('note-editable').innerHTML).toBe('  hello  ')
    await act(async () => {
      fireEvent.keyDown(document, { key: 'z', metaKey: true, shiftKey: true })
      await vi.runOnlyPendingTimersAsync()
    })
    expect(screen.getByLabelText('note-editable').innerHTML).toBe('hello')
  })

  test('does not add a content undo step when blur leaves the value unchanged', async () => {
    await dispatch([importText({ text: '- a\n  - =note\n    - seed' }), setCursor(['a']), toggleNote()])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: 'hello' } })
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe('hello')
    await act(async () => {
      fireEvent.keyDown(document, { key: 'z', metaKey: true })
      await vi.runOnlyPendingTimersAsync()
    })
    expect(screen.getByLabelText('note-editable').innerHTML).toBe('seed')
  })

  test.each(['suppressChange'] as const)('leaves temporary blur untouched while %s is active', async flag => {
    await dispatch([importText({ text: '- a\n  - =note\n    - seed' }), setCursor(['a']), toggleNote()])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: '  hello  ' } })
      editableSyncStore.update({ [flag]: true })
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe('  hello  ')
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toContain('<li>  hello  </li>')

    await act(async () => {
      editableSyncStore.update({ [flag]: false })
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe('hello')
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/html')).toContain('<li>hello</li>')
  })

  test('does not recreate an empty note deleted immediately before blur', async () => {
    await dispatch([importText({ text: '- a\n  - =note\n    - ' }), setCursor(['a']), toggleNote()])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.keyDown(noteEditor, { key: 'Backspace' })
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(screen.queryByLabelText('note-editable')).toBeNull()
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a`)
  })

  test('basic', async () => {
    await dispatch([
      importText({
        text: `
      - a
        - =note
          - foo`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Verify note is rendered
    const noteElement = screen.queryByLabelText('note')
    expect(noteElement)

    // Verify note content
    const element = screen.getByText('foo')
    expect(element)
  })

  test('render note when subthought is edited from non-attribute', async () => {
    await dispatch([
      importText({
        text: `
      - a
        - note
          - foo`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // verify the note is not rendered initially
    const noteElementBefore = screen.queryByLabelText('note')
    expect(noteElementBefore).toBeNull()

    const thoughtElement = screen.getAllByText('note')[0]

    await act(async () => {
      fireEvent.focus(thoughtElement)
      fireEvent.input(thoughtElement, { target: { innerHTML: '=note' } })
    })

    await act(vi.runOnlyPendingTimersAsync)

    // hide the meta attribute, so if the note value can be selected on the screen it must be rendered
    await dispatch([setCursor(['a'])])

    await act(vi.runOnlyPendingTimersAsync)

    // verify the note is rendered
    const noteElement = screen.queryByLabelText('note')
    expect(noteElement)

    // verify the note value is rendered
    const element = screen.getByText('foo')
    expect(element)
  })

  // https://github.com/cybersemics/em/issues/4479
  test('undoes and redoes contiguous typing in a note as one edit', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - `,
      }),
      setCursor(['a']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const noteEditor = screen.getByLabelText('note-editable')

    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: 'a' } })
      fireEvent.input(noteEditor, { target: { innerHTML: 'ab' } })
      fireEvent.input(noteEditor, { target: { innerHTML: 'abc' } })
    })

    await act(async () => {
      store.dispatch(undo())
      await vi.runOnlyPendingTimersAsync()
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - =note
      - `)

    await act(async () => {
      store.dispatch(redo())
      await vi.runOnlyPendingTimersAsync()
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - =note
      - abc`)

    await act(vi.runAllTimersAsync)
  })

  // https://github.com/cybersemics/em/issues/4954
  test('move thought down with the caret in a note', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - test
        - b`,
      }),
      setCursor(['a']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('note-editable'), {
        key: 'ArrowDown',
        metaKey: true,
        shiftKey: true,
      })
    })

    await act(vi.runAllTimersAsync)

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - b
  - a
    - =note
      - test`)
  })

  // https://github.com/cybersemics/em/issues/4954
  test('cursor next with the caret in a note', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - test
          - x
        - b`,
      }),
      setCursor(['a']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText('note-editable'), {
        key: 'ArrowDown',
        metaKey: true,
      })
    })

    await act(vi.runAllTimersAsync)

    expectPathToEqual(store.getState(), store.getState().cursor, ['b'])
  })
})

describe('=note/=path', () => {
  // https://github.com/cybersemics/em/issues/5084
  test('trims each referenced value on blur without losing its descendants', async () => {
    await dispatch([
      importText({
        text: '- a\n  - =note\n    - =path\n      - b\n  - b\n    - c\n      - child of c\n    - d\n      - child of d',
      }),
      setCursor(['a']),
      toggleNote(),
    ])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: '<b> c </b>,  d  ' } })
    })
    expect(noteEditor.innerHTML).toBe('<b> c </b>,  d  ')
    await act(async () => {
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe('<b>c</b>, d')
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - =path
        - b
    - b
      - **c**
        - child of c
      - d
        - child of d`)
  })

  test('preserves both referenced subtrees when trimming creates duplicate values', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - =path
              - b
          - b
            - **c**
              - first subtree
            - **c**
              - second subtree`,
      }),
      setCursor(['a']),
      toggleNote(),
    ])
    await act(vi.runOnlyPendingTimersAsync)
    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: '<b> c </b>, <b>c</b>' } })
      fireEvent.focusOut(noteEditor)
      await vi.runOnlyPendingTimersAsync()
    })
    expect(noteEditor.innerHTML).toBe('<b>c</b>, <b>c</b>')
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a
    - =note
      - =path
        - b
    - b
      - **c**
        - first subtree
      - **c**
        - second subtree`)
  })

  // https://github.com/cybersemics/em/issues/4845
  test('renders all path target children as comma-delimited note text', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - =path
              - b
          - b
            - =sort
              - Alphabetical
            - c
            - d
            - e`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getByLabelText('note-editable').innerHTML).toBe('c, d, e')
  })

  test('edits the corresponding target children while alphabetical sorting changes', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - =path
              - b
          - b
            - =sort
              - Alphabetical
            - c
              - child of c
            - d
              - child of d
            - e`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.focus(noteEditor)
      fireEvent.input(noteEditor, { target: { innerHTML: 'z, d, e' } })
      fireEvent.input(noteEditor, { target: { innerHTML: 'zz, d, e' } })
    })
    await act(vi.runOnlyPendingTimersAsync)

    expect(noteEditor.innerHTML).toBe('zz, d, e')

    const state = store.getState()
    const targetId = contextToThoughtId(state, ['a', 'b'])!
    const children = getChildrenSorted(state, targetId)
    const zz = children.find(child => child.value === 'zz')!
    const d = children.find(child => child.value === 'd')!

    expect(children.map(child => child.value)).toEqual(['d', 'e', 'zz'])
    expect(getChildrenSorted(state, zz.id).map(child => child.value)).toEqual(['child of c'])
    expect(getChildrenSorted(state, d.id).map(child => child.value)).toEqual(['child of d'])

    await act(vi.runAllTimersAsync)
  })

  test('preserves child identity when duplicate values are edited', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - =path
              - b
          - b
            - c
              - child of first c
            - c
              - child of second c
            - d`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.focus(noteEditor)
      fireEvent.input(noteEditor, { target: { innerHTML: 'x, c, d' } })
    })
    await act(vi.runOnlyPendingTimersAsync)

    const state = store.getState()
    const targetId = contextToThoughtId(state, ['a', 'b'])!
    const children = getChildrenSorted(state, targetId)
    const x = children.find(child => child.value === 'x')!
    const c = children.find(child => child.value === 'c')!

    expect(getChildrenSorted(state, x.id).map(child => child.value)).toEqual(['child of first c'])
    expect(getChildrenSorted(state, c.id).map(child => child.value)).toEqual(['child of second c'])

    await act(vi.runAllTimersAsync)
  })

  test('safely adds and removes target children when commas change', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - =path
              - b
          - b
            - c
            - d
            - e`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.focus(noteEditor)
      fireEvent.input(noteEditor, { target: { innerHTML: 'c, d, e, f' } })
    })
    await act(vi.runOnlyPendingTimersAsync)

    let state = store.getState()
    const targetId = contextToThoughtId(state, ['a', 'b'])!
    expect(getChildrenSorted(state, targetId).map(child => child.value)).toEqual(['c', 'd', 'e', 'f'])

    await act(async () => {
      fireEvent.input(noteEditor, { target: { innerHTML: 'c, de' } })
    })
    await act(vi.runOnlyPendingTimersAsync)

    state = store.getState()
    expect(noteEditor.innerHTML).toBe('c, de')
    expect(getChildrenSorted(state, targetId).map(child => child.value)).toEqual(['c', 'de'])

    await act(vi.runAllTimersAsync)
  })

  test('undoes and redoes a multi-child path note edit atomically', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - =note
            - =path
              - b
          - b
            - c
            - d
            - e`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.focus(noteEditor)
      fireEvent.input(noteEditor, { target: { innerHTML: 'cc, dd, ee' } })
    })
    await act(vi.runOnlyPendingTimersAsync)

    const targetId = contextToThoughtId(store.getState(), ['a', 'b'])!
    expect(getChildrenSorted(store.getState(), targetId).map(child => child.value)).toEqual(['cc', 'dd', 'ee'])

    await act(async () => {
      store.dispatch(undo())
      await vi.runOnlyPendingTimersAsync()
    })
    expect(getChildrenSorted(store.getState(), targetId).map(child => child.value)).toEqual(['c', 'd', 'e'])

    await act(async () => {
      store.dispatch(redo())
      await vi.runOnlyPendingTimersAsync()
    })
    expect(getChildrenSorted(store.getState(), targetId).map(child => child.value)).toEqual(['cc', 'dd', 'ee'])

    await act(vi.runAllTimersAsync)
  })

  test('renders a path-based note with correct content', async () => {
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
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Verify note is rendered
    const noteElement = screen.queryByLabelText('note')
    expect(noteElement)

    // The content should appear twice: once in the original thought and once in the note
    const contentInstances = screen.getAllByText('Test')

    // We expect two instances: one from the original thought and one from the note
    expect(contentInstances).toHaveLength(2)
  })

  test('updates target thought when path-based note is edited', async () => {
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

  test('creates missing thought if it does not exist when toggling note', async () => {
    await dispatch([
      importText({
        text: `
        - x
          - =note
            - =path
              - a`,
      }),
      setCursor(['x']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Verify the note editor is visible
    const noteEditor = screen.queryByLabelText('note-editable')
    expect(noteEditor)

    // Verify the 'a' thought was created and is visible in the DOM
    expect(screen.getByText('a'))

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

  test('archives both note and target when archiving a note via user interaction', async () => {
    await dispatch([
      importText({
        text: `
            - x
              - =note
                - =path
                  - a
              - a
                - Hello`,
      }),
      // Focus the note for editing
      setCursor(['x']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    expect(screen.getAllByText('Hello')).toHaveLength(2)

    const noteElement = screen.getAllByText('Hello')[0]

    // Simulate keyboard shortcut for archive/delete
    await act(async () => {
      // Focus the element first
      fireEvent.focus(noteElement)

      fireEvent.keyDown(noteElement, {
        key: 'Backspace',
        shiftKey: true,
        metaKey: true,
      })
    })

    await act(vi.runAllTimersAsync)

    // Verify original note content is no longer visible
    expect(screen.queryByText('Hello')).toBeNull()

    // Verify the target thought is archived
    expect(screen.queryByText('a')).toBeNull()
  })
})

describe('=children/=note', () => {
  test('=children/=note should allow a note to be defined for all children', async () => {
    await dispatch([
      importText({
        text: `
        - x
          - =children
            - =note
              - hello
          - a
          - b
          - c`,
      }),
    ])

    // Wait for all timers and async operations to complete
    await act(vi.runOnlyPendingTimersAsync)

    // Should render one note for child 'a'
    const noteElements = screen.queryAllByLabelText('note')
    expect(noteElements).toHaveLength(3)

    // Verify the note content is correct
    const noteContent = screen.getAllByText('hello')
    expect(noteContent).toHaveLength(3)
  })
})

describe('=children/=note/=path', () => {
  // https://github.com/cybersemics/em/issues/5303
  test('renders and edits an inherited path note on the existing formatted target', async () => {
    await dispatch([
      importText({
        text: `
          - Group
            - =children
              - =note
                - =path
                  - names
            - Reify
              - *Names*
                - Bind Thought
                - Canonize`,
      }),
      setCursor(['Group', 'Reify']),
    ])
    await act(vi.runAllTimersAsync)

    expect(screen.queryByLabelText('note-editable')?.textContent).toBe('Bind Thought, Canonize')

    const noteEditor = screen.getByLabelText('note-editable')
    await act(async () => {
      fireEvent.focus(noteEditor)
      fireEvent.input(noteEditor, { target: { innerHTML: 'Updated, Canonize' } })
      fireEvent.blur(noteEditor)
      await vi.runAllTimersAsync()
    })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Group
    - =children
      - =note
        - =path
          - names
    - Reify
      - *Names*
        - Updated
        - Canonize`)
  })

  test('renders inherited path notes regardless of target case', async () => {
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
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // All three targets match, including lowercase 'year'.
    const noteElements = screen.queryAllByLabelText('note')
    expect(noteElements).toHaveLength(3)

    // Verify the note content
    const year1 = screen.getAllByText('2009')
    const year2 = screen.getAllByText('2010')
    const year3 = screen.getAllByText('2011')

    // We expect each year to be rendered in the note once: as a note value
    expect(year1).toHaveLength(1)
    expect(year2).toHaveLength(1)
    expect(year3).toHaveLength(1)
  })

  test('update the target thought when the note is edited and vice versa', async () => {
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

  test('render only existing notes (empty notes are not rendered)', async () => {
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
          - c
           - Years
              - 2011`,
      }),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Should render only one note (for child 'a' which has Year/2009)
    const noteElements = screen.queryAllByLabelText('note')
    expect(noteElements).toHaveLength(1)

    // Verify the note contains the expected content
    const noteWithContent = screen.queryByText('2009')
    expect(noteWithContent)

    // Child 'b' has no Year subthought, so no note should be rendered for it
    // Child 'c' has plural 'Years' which doesn't match 'Year', so no note either.
    const year2011 = screen.queryByText('2011')
    expect(year2011).toBeNull()
  })

  test('allow adding a missing note via =children/=note/=path', async () => {
    await dispatch([
      importText({
        text: `
        - x
          - =children
            - =note
              - =path
                - Year
          - a
          - b
          - c`,
      }),
      // Focus any child which doesn't have a Year subthought
      setCursor(['x', 'b']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    // Verify the note editor is visible for child 'b'
    const noteEditor = screen.queryByLabelText('note-editable')
    expect(noteEditor)

    // Verify Year thought is created and is visible in the DOM
    expect(screen.getByText('Year'))

    // Verify that the note is empty (since 'Year' was just created)
    expect(noteEditor?.innerHTML).toBe('')

    // Add content to the note, which should create the missing Year subthought
    await act(async () => {
      fireEvent.focus(noteEditor!)
      fireEvent.input(noteEditor!, { target: { innerHTML: '2010' } })
    })

    await act(vi.runOnlyPendingTimersAsync)

    // Verify the Year subthought was created under 'b' and contains the note content
    const year2010Elements = screen.getAllByText('2010')
    expect(year2010Elements).toHaveLength(2) // One in the note, one in the actual thought
  })

  test('allow deleting a note via =children/=note/=path', async () => {
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
      // Focus child 'b' to edit its note
      setCursor(['x', 'b']),
      toggleNote(),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    const noteElement = screen.getAllByText('2010')[0]

    // Simulate keyboard shortcut for archive/delete
    await act(async () => {
      // Focus the element first
      fireEvent.focus(noteElement)

      fireEvent.keyDown(noteElement, {
        key: 'Backspace',
        shiftKey: true,
        metaKey: true,
      })
    })

    await act(vi.runAllTimersAsync)

    // Verify the note content is no longer visible
    expect(screen.queryByText('2010')).toBeNull()

    // Verify other notes are still present
    expect(screen.getByText('2009'))
    expect(screen.getByText('2011'))
  })
})
