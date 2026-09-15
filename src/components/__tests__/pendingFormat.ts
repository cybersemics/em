import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { UnknownAction } from 'redux'
import Thunk from '../../@types/Thunk'
import { formatSelectionActionCreator as formatSelection } from '../../actions/formatSelection'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { undoActionCreator as undo } from '../../actions/undo'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'

/**
 * Formatting applied to an *empty* thought (#3910). An empty thought's value must stay empty, so the formatting has
 * nowhere to live in the thoughtspace until text is typed into it. The behavior spans formatSelection (which holds
 * it), Editable's onChangeHandler (which transfers it onto the first typed character), undo, and the placeholder that
 * previews it, so the tests are grouped by feature rather than filed under any one of those. The bullet's use of the
 * same formatting lives in thoughtFill.ts, and its interaction with Clear Thought in commands/__tests__/clearThought.ts.
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

  // #3910: an empty thought has no text to color, so the color it is holding is previewed on the placeholder instead.
  // This is what tells the user what the text they are about to type will look like.
  it('previews the color of an empty thought on its placeholder (#3910)', async () => {
    await dispatch(importText({ text: '- ' }))
    await dispatch(formatSelection('foreColor', 'green'))

    expect(getEditable().style.getPropertyValue('--placeholder-color')).toBe('#00d688')
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

    await dispatch(setCursor(['']))
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

    await dispatch(setCursor(['']))
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
    const id = head(store.getState().cursor!)
    await dispatch(formatSelection('foreColor', 'green'))

    await dispatch(undo())
    expect(getThoughtById(store.getState(), id)?.value).toBe('')

    await dispatch(setCursor(['']))
    const user = userEvent.setup({ delay: null })
    await user.type(getEditable(), 'H')
    await act(vi.runAllTimersAsync)

    const state = store.getState()
    const cursorValue = getThoughtById(state, head(state.cursor!))!.value

    expect(cursorValue).toBe('H')
  })
})
