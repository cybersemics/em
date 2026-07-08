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
// keyboard is open, so the handler defers to `onFocus` for the second tap regardless of which thought
// is tapped. The adjacency difference is NOT in the handler — it is in whether iOS delivers a `focus`
// event on the second tap:
//   - Adjacent re-tap: iOS fires `touchend` on the second thought but NOT `focus` (the synthesized
//     click retargets to the first thought). `onFocus` never runs, so the deferral is never honored
//     and the cursor stays put. THIS IS THE BUG.
//   - Non-adjacent tap: iOS DOES fire `focus`, so the deferred `onFocus` runs and the cursor moves.
//     This is why a non-adjacent tap works even with the keyboard open.
//
// This is reproduced at the handler level (a pure synthetic-touch e2e cannot: WebDriver taps force
// focus onto the target, bypassing the real-finger rapid-tap focus suppression). The tests below
// faithfully model each case by firing exactly the DOM events iOS delivers in that scenario.

/**
 * Seeds three sibling thoughts a/b/c, puts the cursor on `a` (the state left by a first tap on `a`)
 * with the keyboard open or closed, then simulates a tap on `target` by firing the exact DOM events
 * iOS delivers: always `touchend`, plus `focus` only when `deliversFocus` is true (iOS suppresses
 * `focus` on a rapid ADJACENT re-tap but delivers it on a non-adjacent tap). Returns the value of the
 * thought the cursor ends on.
 */
const tapThoughtOnTouchEnd = async ({
  target,
  isKeyboardOpen,
  deliversFocus,
}: {
  target: string
  isKeyboardOpen: boolean
  deliversFocus: boolean
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

  // touchend always fires on the tapped thought.
  await act(async () => {
    fireEvent.touchEnd(editable)
  })
  // focus fires only when iOS delivers it (non-adjacent tap); it is suppressed on a rapid adjacent re-tap.
  if (deliversFocus) {
    await act(async () => {
      editable.focus()
      fireEvent.focus(editable)
    })
  }
  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  return state.cursor ? headValue(state, state.cursor) : undefined
}

describe('#4173: tapping a thought after another', () => {
  // Control 1: with the keyboard CLOSED, `handleTapBehavior` sets the cursor directly on `touchend`
  // (no deferral to onFocus). This proves the touchend handler is wired and IS meant to drive the
  // cursor-setting chain, so the bug test below cannot pass merely because the handler is detached.
  it('moves the cursor on touchend while the keyboard is closed (control)', async () => {
    expect(await tapThoughtOnTouchEnd({ target: 'b', isKeyboardOpen: false, deliversFocus: false })).toBe('b')
  })

  // Control 2: NON-ADJACENT tap with the keyboard OPEN. iOS delivers `focus`, so the deferred
  // `onFocus` runs and the cursor moves. This proves the keyboard-open state is NOT itself the
  // problem — a tap works fine with the keyboard open as long as `focus` is delivered. It isolates the
  // bug to the missing `focus` on the adjacent re-tap, matching the issue report that a non-adjacent
  // thought works.
  it('moves the cursor on a non-adjacent tap while the keyboard is open (control)', async () => {
    expect(await tapThoughtOnTouchEnd({ target: 'c', isKeyboardOpen: true, deliversFocus: true })).toBe('c')
  })

  // #4173: ADJACENT re-tap with the keyboard OPEN. iOS fires `touchend` but suppresses `focus`, so the
  // handler's deferral to `onFocus` is never honored and the cursor does not move. Asserts the CURRENT
  // (buggy) outcome: the cursor stays on 'a'.
  //
  // WHEN #4173 IS FIXED — by having `handleTapBehavior` set the cursor directly on `touchend` for a
  // visible non-cursor thought instead of relying solely on `onFocus` — this test will start failing.
  // At that point change the expected value from 'a' to 'b' (matching control 1) so it becomes a live
  // regression guard for the fixed behavior.
  it('does NOT move the cursor on an adjacent re-tap while the keyboard is open (#4173)', async () => {
    expect(await tapThoughtOnTouchEnd({ target: 'b', isKeyboardOpen: true, deliversFocus: false })).toBe('a')
  })
})
