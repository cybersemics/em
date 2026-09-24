import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { UnknownAction } from 'redux'
import Thunk from '../../@types/Thunk'
import { addMulticursorActionCreator as addMulticursor } from '../../actions/addMulticursor'
import { clearMulticursorsActionCreator as clearMulticursors } from '../../actions/clearMulticursors'
import { formatSelectionActionCreator as formatSelection } from '../../actions/formatSelection'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { toggleNoteActionCreator as toggleNote } from '../../actions/toggleNote'
import { undoActionCreator as undo } from '../../actions/undo'
import getThoughtById from '../../selectors/getThoughtById'
import noteValue from '../../selectors/noteValue'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'

/**
 * Formatting applied to an *empty* thought or note (#3910). Their value must stay empty, so the formatting has
 * nowhere to live in the thoughtspace until text is typed into it. The behavior spans formatSelection (which holds
 * it), the onChange handlers in Editable and Note (which transfer it onto the first typed character), undo, and the
 * placeholder that previews it, so the tests are grouped by feature rather than filed under any one of those. The
 * bullet's use of the same formatting lives in thoughtFill.ts, and its interaction with Clear Thought in
 * commands/__tests__/clearThought.ts.
 *
 * Only the first character is typed in each case. Once the value carries the formatting, the remaining characters
 * inherit it from the caret, which is native contenteditable behavior that JSDOM does not implement (covered in
 * e2e/puppeteer/__tests__/color.ts).
 */

/** Returns the editable DOM element for the cursor thought. */
const getEditable = (): HTMLElement => {
  const state = store.getState()
  const id = head(state.cursor!)
  const editable = document.querySelector(`[aria-label="editable-${id}"]`)
  if (!editable) throw new Error(`Editable not found for thought ${id}`)
  return editable as HTMLElement
}

/** Returns the editable DOM element for the note of the cursor thought. */
const getNoteEditable = (): HTMLElement => {
  const editable = document.querySelector('[aria-label="note-editable"]')
  if (!editable) throw new Error('Note editable not found')
  return editable as HTMLElement
}

/** Dispatches an action (or array of actions) wrapped in act(), then flushes pending timers, so the React state updates
 * triggered by the dispatch (e.g. NavBar re-rendering on a cursor change) are wrapped in act() as React requires. */
const dispatch = async (action: Thunk[] | Thunk | UnknownAction) => {
  act(() => {
    store.dispatch(Array.isArray(action) ? action : [action])
  })
  await act(vi.runOnlyPendingTimersAsync)
}

describe('pending format', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('applies a color to the text typed into an empty thought (#3910)', async () => {
    await dispatch(newThought({ value: '' }))

    await dispatch(formatSelection('foreColor', 'green'))

    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()
    const cursorValue = getThoughtById(state, head(state.cursor!))!.value

    expect(cursorValue).toBe('<font color="#00d688">H</font>')
  })

  // #3910: the color is held against the thought rather than the cursor, so it survives the cursor leaving and
  // returning before any text is typed.
  it('keeps the color of an empty thought when the cursor moves away and back (#3910)', async () => {
    await dispatch([newThought({ value: 'a' }), newThought({ value: '' })])

    await dispatch(formatSelection('foreColor', 'green'))
    await dispatch(setCursor(['a']))
    await dispatch(setCursor(['']))

    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()
    const cursorValue = getThoughtById(state, head(state.cursor!))!.value

    expect(cursorValue).toBe('<font color="#00d688">H</font>')
  })

  // #3910: the formatting held for an empty thought is keyed by thought id, so formatting a second empty thought does
  // not discard the first thought's formatting.
  it('holds a color for each empty thought independently (#3910)', async () => {
    await dispatch(newThought({ value: '' }))
    const emptyPath = store.getState().cursor!

    await dispatch(formatSelection('foreColor', 'green'))

    await dispatch(newThought({ value: '' }))
    await dispatch(formatSelection('foreColor', 'blue'))

    await dispatch(setCursorPath({ path: emptyPath }))

    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()
    const cursorValue = getThoughtById(state, head(state.cursor!))!.value

    expect(cursorValue).toBe('<font color="#00d688">H</font>')
  })

  // #3910: a multiselect colors each selected thought in full, so an empty one among them holds the color the same way
  // a lone empty thought does. Before this, formatSelection's multicursor branch formatted each thought's value, and an
  // empty value has no text for the tags to wrap, so the command was a silent no-op on every empty thought selected.
  it('holds a color for each empty thought in a multiselect (#3910)', async () => {
    await dispatch(newThought({ value: '' }))
    const first = store.getState().cursor!
    await dispatch(newThought({ value: '' }))
    const second = store.getState().cursor!

    await dispatch([addMulticursor({ path: first }), addMulticursor({ path: second })])
    await dispatch(formatSelection('foreColor', 'green'))
    await dispatch(clearMulticursors())

    const user = userEvent.setup({ delay: null })

    await dispatch(setCursorPath({ path: first }))
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    await dispatch(setCursorPath({ path: second }))
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()

    expect(getThoughtById(state, head(first))!.value).toBe('<font color="#00d688">H</font>')
    expect(getThoughtById(state, head(second))!.value).toBe('<font color="#00d688">H</font>')
  })

  // #3910: a multiselect of both kinds colors each thought by the means available to it — the value of the one that has
  // text, the held formatting of the one that does not — in a single command.
  it('colors an empty and a non-empty thought together in a multiselect (#3910)', async () => {
    await dispatch(newThought({ value: 'a' }))
    const nonEmpty = store.getState().cursor!
    await dispatch(newThought({ value: '' }))
    const empty = store.getState().cursor!

    await dispatch([addMulticursor({ path: nonEmpty }), addMulticursor({ path: empty })])
    await dispatch(formatSelection('foreColor', 'green'))
    await dispatch(clearMulticursors())

    await dispatch(setCursorPath({ path: empty }))
    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()

    expect(getThoughtById(state, head(nonEmpty))!.value).toBe('<font color="#00d688">a</font>')
    expect(getThoughtById(state, head(empty))!.value).toBe('<font color="#00d688">H</font>')
  })

  // #3910: an empty thought has no text to color, so the color it is holding is previewed on the placeholder instead.
  // This is what tells the user what the text they are about to type will look like.
  it('previews the color of an empty thought on its placeholder (#3910)', async () => {
    await dispatch(importText({ text: '- ' }))
    await dispatch(formatSelection('foreColor', 'green'))

    expect(getEditable().style.getPropertyValue('--placeholder-color')).toBe('#00d688')
    expect(getEditable().style.getPropertyValue('--placeholder-opacity')).toBe('0.5')
  })

  // #3910: only a color is dimmed on the placeholder; a tag command such as bold previews at full opacity.
  it('does not dim the placeholder of an empty thought held in bold (#3910)', async () => {
    await dispatch(importText({ text: '- ' }))
    await dispatch(formatSelection('bold'))

    expect(getEditable()).toHaveAttribute('data-placeholder-bold')
    expect(getEditable().style.getPropertyValue('--placeholder-opacity')).toBe('')
  })

  // #3910: a pending background uses the dynamic CSS variable introduced for Clear Thought's placeholder (#4616),
  // while the opacity variable applies its dimmed treatment.
  it('previews a dimmed background color on This is an empty thought (#3910)', async () => {
    await dispatch(importText({ text: '- ' }))
    vi.setSystemTime(Date.now() + 5001)
    await dispatch(formatSelection('backColor', 'green'))

    expect(getEditable()).toHaveAttribute('placeholder', 'This is an empty thought')
    expect(getEditable().style.getPropertyValue('--placeholder-background-color')).toBe('rgb(0, 214, 136)')
    expect(getEditable().style.getPropertyValue('--placeholder-opacity')).toBe('0.5')
  })

  // #3910: a note is a thought, so it holds formatting applied while it is empty the same way. toggleNote creates the
  // note's thought with an empty value, which is what gives the formatting somewhere to live.
  it('applies a color to the text typed into an empty note (#3910)', async () => {
    await dispatch([importText({ text: '- x' }), toggleNote()])
    await dispatch(formatSelection('foreColor', 'green'))

    const user = userEvent.setup({ delay: null })
    await user.type(getNoteEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()

    expect(noteValue(state, state.cursor!)).toBe('<font color="#00d688">H</font>')
  })

  // #3910: the note's placeholder previews the held formatting, as the thought's does.
  it('previews the color of an empty note on its placeholder (#3910)', async () => {
    await dispatch([importText({ text: '- x' }), toggleNote()])
    await dispatch(formatSelection('foreColor', 'green'))

    expect(getNoteEditable().style.getPropertyValue('--placeholder-color')).toBe('#00d688')
    expect(getNoteEditable().style.getPropertyValue('--placeholder-opacity')).toBe('0.5')
  })

  it('previews a dimmed background color on an empty note (#3910)', async () => {
    await dispatch([importText({ text: '- x' }), toggleNote()])
    await dispatch(formatSelection('backColor', 'green'))

    expect(getNoteEditable().style.getPropertyValue('--placeholder-background-color')).toBe('rgb(0, 214, 136)')
    expect(getNoteEditable().style.getPropertyValue('--placeholder-opacity')).toBe('0.5')
  })

  // #3910: a tag command applies to the text typed into an empty note the same way a color does, even though it does
  // not preview on the placeholder (see Note.tsx).
  it('applies bold to the text typed into an empty note (#3910)', async () => {
    await dispatch([importText({ text: '- x' }), toggleNote()])
    await dispatch(formatSelection('bold'))

    const user = userEvent.setup({ delay: null })
    await user.type(getNoteEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()

    expect(noteValue(state, state.cursor!)).toBe('<b>H</b>')
  })

  // #3910: a color applied to an empty thought must take part in undo like a color applied to text. Undoing the first
  // typed character restores the empty thought, so the color it was holding has to come back with it — otherwise undo
  // leaves an empty, uncolored thought that the user never created. Typing again is what proves the color survived,
  // without depending on where it is held. The empty thought is imported rather than created with newThought so that
  // its creation is a separate undo step, which the first typed character would otherwise merge into.
  // https://github.com/cybersemics/em/issues/3910
  it('restores the color of an empty thought when the first typed character is undone (#3910)', async () => {
    await dispatch(importText({ text: '- ' }))
    // captured before the undo, which can leave the cursor null
    const id = head(store.getState().cursor!)
    await dispatch(formatSelection('foreColor', 'green'))

    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    await dispatch(undo())
    expect(getThoughtById(store.getState(), id)?.value).toBe('')

    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()
    const cursorValue = getThoughtById(state, head(state.cursor!))!.value

    expect(cursorValue).toBe('<font color="#00d688">H</font>')
  })

  // #3910: each color applied to an empty thought is its own undo step, as it is for a thought with text. Asserting
  // green distinguishes the intended behavior from both plausible wrong ones: reverting nothing would leave blue, and
  // reverting more than one step would take the thought with it.
  // https://github.com/cybersemics/em/issues/3910
  it('undoes one color at a time on an empty thought (#3910)', async () => {
    await dispatch(importText({ text: '- ' }))
    const id = head(store.getState().cursor!)
    await dispatch(formatSelection('foreColor', 'green'))
    await dispatch(formatSelection('foreColor', 'blue'))

    await dispatch(undo())
    expect(getThoughtById(store.getState(), id)?.value).toBe('')

    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()
    const cursorValue = getThoughtById(state, head(state.cursor!))!.value

    expect(cursorValue).toBe('<font color="#00d688">H</font>')
  })

  // #3910: undoing the only color applied to an empty thought leaves it with no color, so the next character typed is
  // unformatted. Asserted in this direction rather than as undo-then-redo, which would pass on a build where undo does
  // nothing at all.
  // https://github.com/cybersemics/em/issues/3910
  it('removes the color of an empty thought when it is undone (#3910)', async () => {
    await dispatch(importText({ text: '- ' }))
    await dispatch(formatSelection('foreColor', 'green'))

    await dispatch(undo())

    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()
    const cursorValue = getThoughtById(state, head(state.cursor!))!.value

    expect(cursorValue).toBe('H')
  })
})
