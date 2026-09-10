import { renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../actions/keyboardOpen'
import * as selection from '../../../device/selection'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import head from '../../../util/head'
import useCaretRestore from '../useCaretRestore'
import useEditMode from '../useEditMode'

// Emulate iOS Safari, where the virtual keyboard's trackpad (long press the space bar) moves the browser
// selection by hit-testing the whole document, dragging it out of the focused editing host. See #3276.
vi.mock('../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../browser')>()
  return {
    ...actual,
    isTouch: true,
    isSafari: () => true,
  }
})

beforeEach(initStore)

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an editable for the given thought, as Editable does. */
const createEditable = (thoughtId: string, value: string) => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.setAttribute('data-editable', '')
  editable.setAttribute('aria-label', `editable-${thoughtId}`)
  editable.appendChild(document.createTextNode(value))
  document.body.appendChild(editable)
  return editable
}

/** Renders a note editable, as Note does. */
const createNoteEditable = (value: string) => {
  const note = document.createElement('div')
  note.setAttribute('contenteditable', 'true')
  note.setAttribute('aria-label', 'note-editable')
  note.appendChild(document.createTextNode(value))
  document.body.appendChild(note)
  return note
}

/** Mounts useEditMode on the cursor thought's editable. */
const mountEditMode = (editable: HTMLElement) =>
  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: true,
        path: store.getState().cursor!,
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

/** Moves the browser selection into the given editable and fires the selectionchange the browser would fire. */
const moveSelectionTo = async (editable: HTMLElement) => {
  act(() => {
    selection.set(editable, { offset: 0 })
    document.dispatchEvent(new Event('selectionchange'))
  })
  await act(vi.runAllTimersAsync)
}

/** Selects the whole text of an editable, as the trackpad does when it extends a range from the caret. */
const selectAllOf = async (editable: HTMLElement) => {
  act(() => {
    selection.setRange(editable, { start: 0, end: editable.textContent!.length })
    document.dispatchEvent(new Event('selectionchange'))
  })
  await act(vi.runAllTimersAsync)
}

it('restores the caret to the cursor thought when the selection is dragged out of it', async () => {
  store.dispatch([importText({ text: '- a\n- b' }), setCursor(['a']), keyboardOpen({ value: true })])

  const state = store.getState()
  const cursorId = head(state.cursor!)
  const editable = createEditable(cursorId, 'a')
  const other = createEditable('other-id', 'b')

  mountEditMode(editable)
  act(() => editable.focus())

  // the user's finger is on the space bar, not the page: no touch has reached an editable for a while
  await act(() => vi.advanceTimersByTimeAsync(1000))

  await moveSelectionTo(other)

  // the trackpad never moves the focus, so the stranded selection is pulled back to the cursor thought
  expect(selection.isOnEditable(cursorId)).toBe(true)
  // the drag only leaves past the left edge, so the caret belongs at the start
  expect(selection.offsetThought()).toBe(0)
  expect(store.getState().cursor).toEqual(state.cursor)
})

it('does not restore the caret while a press is in progress', async () => {
  store.dispatch([importText({ text: '- a\n- b' }), setCursor(['a']), keyboardOpen({ value: true })])

  const cursorId = head(store.getState().cursor!)
  const editable = createEditable(cursorId, 'a')
  const other = createEditable('other-id', 'b')

  mountEditMode(editable)
  act(() => editable.focus())

  // a long press dragging a selection fires selectionchange continuously between touchstart and touchend
  act(() => {
    editable.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }))
  })
  await act(() => vi.advanceTimersByTimeAsync(1000))

  await moveSelectionTo(other)

  expect(selection.isOnEditable(cursorId)).toBe(false)
})

it('does not restore the caret just after a tap moved the selection to another thought', async () => {
  store.dispatch([importText({ text: '- a\n- b' }), setCursor(['a']), keyboardOpen({ value: true })])

  const cursorId = head(store.getState().cursor!)
  const editable = createEditable(cursorId, 'a')
  const other = createEditable('other-id', 'b')

  mountEditMode(editable)
  act(() => editable.focus())

  // a tap is the user deliberately moving the caret, including into a thought about to become the cursor
  act(() => {
    editable.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }))
    editable.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [] }))
  })

  await moveSelectionTo(other)

  expect(selection.isOnEditable(cursorId)).toBe(false)
})

it('restores the caret to the end of a note when the selection is dragged out of it', async () => {
  store.dispatch([importText({ text: '- a\n- b' }), setCursor(['a']), keyboardOpen({ value: true })])

  const note = createNoteEditable('A')
  const other = createEditable('other-id', 'b')

  renderHook(() => useCaretRestore({ editableRef: { current: note }, enabled: true, end: true }), {
    wrapper: ({ children }) => createElement(Provider, { store, children }),
  })
  act(() => note.focus())

  await act(() => vi.advanceTimersByTimeAsync(1000))

  await moveSelectionTo(other)

  // a one-character note is short enough that the trackpad escapes it with no drag at all, and it only escapes
  // from the end, where the note abuts the parent thought
  expect(selection.offsetFromNode(note)).toBe(1)
})

it('collapses a range the trackpad extends from the caret it just restored', async () => {
  store.dispatch([importText({ text: '- ab\n- c' }), setCursor(['ab']), keyboardOpen({ value: true })])

  const cursorId = head(store.getState().cursor!)
  const editable = createEditable(cursorId, 'ab')
  const other = createEditable('other-id', 'c')

  mountEditMode(editable)
  act(() => editable.focus())
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // the drag escapes the thought and is pulled back, which is what marks the drag as underway
  await moveSelectionTo(other)

  // the drag is still running, and extends from the restored caret back toward the finger
  await selectAllOf(editable)

  expect(selection.isCollapsed()).toBe(true)
  expect(selection.offsetThought()).toBe(0)
})

it('leaves a range alone when no trackpad drag preceded it', async () => {
  store.dispatch([importText({ text: '- ab\n- c' }), setCursor(['ab']), keyboardOpen({ value: true })])

  const cursorId = head(store.getState().cursor!)
  const editable = createEditable(cursorId, 'ab')

  mountEditMode(editable)
  act(() => editable.focus())
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // Select All from the edit menu produces a range with no touch and no escaped caret, and must survive
  await selectAllOf(editable)

  expect(selection.isCollapsed()).toBe(false)
  expect(selection.text()).toBe('ab')
})

it('stops collapsing ranges once a finger returns to the page', async () => {
  store.dispatch([importText({ text: '- ab\n- c' }), setCursor(['ab']), keyboardOpen({ value: true })])

  const cursorId = head(store.getState().cursor!)
  const editable = createEditable(cursorId, 'ab')
  const other = createEditable('other-id', 'c')

  mountEditMode(editable)
  act(() => editable.focus())
  await act(() => vi.advanceTimersByTimeAsync(1000))

  await moveSelectionTo(other)

  // the trackpad session ends when the user touches the page again; dragging a selection handle afterwards is
  // the user's own range, even though the handles are native UI that may never touch the editable
  act(() => {
    editable.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }))
    editable.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [] }))
  })
  await act(() => vi.advanceTimersByTimeAsync(1000))

  await selectAllOf(editable)

  expect(selection.isCollapsed()).toBe(false)
})
