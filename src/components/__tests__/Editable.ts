import { fireEvent } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../actions/keyboardOpen'
import { HOME_TOKEN } from '../../constants'
import * as selection from '../../device/selection'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import windowEvent from '../../test-helpers/windowEvent'
import headValue from '../../util/headValue'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

// Using a clipboard app such as Paste for iOS or the built-in clipboard viewer on Android directly modifies the innerHTML and triggers an onChange event on the contenteditable.
it('"paste" from clipboard app into empty thought', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  // The clipboard app replaces plaintext newlines with divs.
  editable.innerHTML = '- a<div>  -b</div><div>    - c</div>'
  fireEvent.input(editable, { bubbles: true })
  await act(vi.runAllTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - c`)
})

it('"paste" from clipboard app into non-empty thought', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  const user = userEvent.setup({ delay: null })
  await user.type(editable, 'test')
  await act(vi.runAllTimersAsync)

  // The clipboard app appends the text to the existing content.
  editable.innerHTML = 'test- a<div>  -b</div><div>    - c</div>'
  fireEvent.input(editable, { bubbles: true })
  await act(vi.runAllTimersAsync)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - test
    - a
      - b
        - c`)
})

it('inserts emoji spacing immediately and allows Backspace at the emoji boundary', async () => {
  act(() => {
    windowEvent('keydown', { key: 'Enter' })
  })

  const editable = (await findThoughtByText(''))!
  expect(editable).toBeVisible()

  editable.innerHTML = '🧠Hello'
  fireEvent.input(editable, { bubbles: true })
  expect(editable.textContent).toBe('🧠 Hello')

  const user = userEvent.setup({ delay: null })
  editable.focus()
  selection.set(editable, { offset: '🧠 '.length })
  await user.keyboard('{Backspace}')
  await act(vi.runAllTimersAsync)

  expect(editable.textContent).toBe('🧠Hello')
})

// Tests for https://github.com/cybersemics/em/issues/4173.
//
// #4173: on iOS Safari, tapping an adjacent thought immediately after tapping another one fails to
// move the caret — it stays stuck on the first thought.
//
// Mechanism (confirmed by on-device logging). `handleTapBehavior` fires on `touchend`. For a visible
// thought it either sets the cursor directly, OR — when `editingOrOnCursor` is true — takes a
// "no-op (cursor set via onFocus)" branch that defers all cursor-setting to the thought's `onFocus`
// handler. `editingOrOnCursor` is true whenever the keyboard is open. After the first tap the
// keyboard is open, so a second, rapid tap on an adjacent thought hits that no-op branch. On a real
// device the rapid re-tap fires `touchend` on the second thought but NOT `focus` (the synthesized
// click retargets to the first thought), so `onFocus` never runs and nothing moves the cursor.
//
// This is reproduced at the handler level (a pure synthetic-touch e2e cannot: WebDriver taps force
// focus onto the target, bypassing the real-finger rapid-tap focus suppression). The two tests below
// differ ONLY in keyboard state, which isolates the bug:
//   - keyboard CLOSED (control): `touchend` moves the cursor — proving `touchend` is wired and is
//     supposed to drive the cursor-setting chain.
//   - keyboard OPEN (#4173): the same `touchend` does NOT move the cursor, because the handler defers
//     to an `onFocus` that never fires.

/**
 * Seeds three sibling thoughts a/b/c, puts the cursor on `a` with the keyboard open or closed (the
 * state left by a first tap on `a`), then fires `touchend` on the adjacent thought `b` — the DOM
 * events a rapid iOS re-tap delivers, notably WITHOUT a `focus` event. Returns the value of the
 * thought the cursor ends on.
 */
const tapAdjacentThoughtOnTouchEnd = async (isKeyboardOpen: boolean): Promise<string | undefined> => {
  await dispatch([
    importText({
      text: `
        - a
        - b
        - c
      `,
    }),
  ])
  await act(vi.runOnlyPendingTimersAsync)

  // Set up the state left by the first tap on `a`: cursor on `a`, keyboard open or closed.
  await dispatch([setCursor(['a']), keyboardOpen({ value: isKeyboardOpen })])
  await act(vi.runOnlyPendingTimersAsync)

  // The second tap lands on the adjacent thought `b`. On iOS this fires `touchend` but not `focus`.
  const editableB = (await findThoughtByText('b'))!
  expect(editableB).toBeTruthy()
  await act(async () => {
    fireEvent.touchEnd(editableB)
  })
  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  return state.cursor ? headValue(state, state.cursor) : undefined
}

describe('#4173: tapping an adjacent thought', () => {
  // Control: with the keyboard closed, `handleTapBehavior` sets the cursor directly on `touchend`.
  // This proves the touchend handler is wired and IS meant to drive the cursor-setting chain, so the
  // bug test below cannot pass merely because the handler is detached or the tap is a no-op.
  it('moves the cursor on touchend while the keyboard is closed (control)', async () => {
    expect(await tapAdjacentThoughtOnTouchEnd(false)).toBe('b')
  })

  // #4173: with the keyboard open (the state after a first tap), the SAME `touchend` on the adjacent
  // thought does NOT move the cursor — the handler defers to an `onFocus` that never fires on a rapid
  // iOS re-tap. Asserts the CURRENT (buggy) outcome: the cursor stays on 'a'.
  //
  // WHEN #4173 IS FIXED — by having `handleTapBehavior` set the cursor directly on `touchend` for a
  // visible non-cursor thought instead of relying solely on `onFocus` — this test will start failing.
  // At that point change the expected value from 'a' to 'b' (matching the control) so it becomes a
  // live regression guard for the fixed behavior.
  it('does NOT move the cursor on touchend while the keyboard is open (#4173)', async () => {
    expect(await tapAdjacentThoughtOnTouchEnd(true)).toBe('a')
  })
})
