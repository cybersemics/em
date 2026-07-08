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
// #4173: on iOS Safari, tapping an ADJACENT thought immediately after tapping another one fails to
// move the caret — it stays stuck on the first thought. Tapping a NON-ADJACENT thought works.
//
// Mechanism (confirmed by on-device logging). `handleTapBehavior` fires on `touchend`. For a visible
// thought it either sets the cursor directly, OR — when `editingOrOnCursor` is true — takes a
// "no-op (cursor set via onFocus)" branch that defers all cursor-setting to the thought's `onFocus`
// handler. `editingOrOnCursor` is true whenever the keyboard is open. After the first tap the
// keyboard is open, so `touchend` on the second thought defers to `onFocus` and does nothing on its
// own. On a real device the rapid ADJACENT re-tap fires `touchend` but iOS suppresses `focus` (the
// synthesized click retargets to the first thought), so `onFocus` never runs and the cursor stays put.
//
// The tests below reproduce this at the handler level by firing the DOM events iOS delivers —
// crucially, `touchend` WITHOUT a `focus` event. A pure synthetic-touch e2e cannot reproduce it:
// WebDriver taps force focus onto the target, bypassing the real-finger rapid-tap focus suppression.
//
// Note on the non-adjacent case: it is NOT reproducible at the handler level. The only reason a
// non-adjacent tap works is that iOS delivers a `focus` event, and at this level the handler cannot
// distinguish adjacency at all — `touchend` alone on ANY thought stays on 'a' while the keyboard is
// open. A "control" that fired a synthetic `focus` would just be invoking `onFocus` directly (the
// very event whose absence IS the bug), so it would prove nothing about the tap behavior. The
// adjacency difference lives in WebKit's focus delivery, which jsdom does not model.

/**
 * Seeds three sibling thoughts a/b/c, puts the cursor on `a` (the state left by a first tap on `a`)
 * with the keyboard open or closed, then fires `touchend` on `target` — the DOM event iOS delivers on
 * a tap, notably WITHOUT a `focus` event (which iOS suppresses on a rapid adjacent re-tap). Returns
 * the value of the thought the cursor ends on.
 */
const tapThoughtOnTouchEnd = async ({
  target,
  isKeyboardOpen,
}: {
  target: string
  isKeyboardOpen: boolean
}): Promise<string | undefined> => {
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

  const editable = (await findThoughtByText(target))!
  expect(editable).toBeTruthy()

  // Fire touchend only — iOS suppresses the focus event on a rapid adjacent re-tap.
  await act(async () => {
    fireEvent.touchEnd(editable)
  })
  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  return state.cursor ? headValue(state, state.cursor) : undefined
}

describe('#4173: tapping a thought after another', () => {
  // Control: with the keyboard CLOSED, `handleTapBehavior` sets the cursor directly on `touchend`
  // (no deferral to onFocus). This proves the touchend handler is wired and IS meant to drive the
  // cursor-setting chain, so the bug test below cannot pass merely because the handler is detached or
  // touchend is a no-op — the ONLY difference between the two tests is keyboard state.
  it('moves the cursor on touchend while the keyboard is closed (control)', async () => {
    expect(await tapThoughtOnTouchEnd({ target: 'b', isKeyboardOpen: false })).toBe('b')
  })

  // #4173: with the keyboard OPEN (the state after a first tap), the SAME `touchend` — without a focus
  // event, as on a rapid adjacent re-tap — does NOT move the cursor, because the handler defers to an
  // `onFocus` that never fires. Asserts the CURRENT (buggy) outcome: the cursor stays on 'a'.
  //
  // WHEN #4173 IS FIXED — by having `handleTapBehavior` set the cursor directly on `touchend` for a
  // visible non-cursor thought instead of relying solely on `onFocus` — this test will start failing.
  // At that point change the expected value from 'a' to 'b' (matching the control) so it becomes a
  // live regression guard for the fixed behavior.
  it('does NOT move the cursor on touchend (no focus) while the keyboard is open (#4173)', async () => {
    expect(await tapThoughtOnTouchEnd({ target: 'b', isKeyboardOpen: true })).toBe('a')
  })
})
