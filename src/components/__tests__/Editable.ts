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

// Regression test for https://github.com/cybersemics/em/issues/4173
//
// On iOS Safari, when the keyboard is already open (i.e. immediately after tapping one thought),
// a rapid tap on an adjacent thought fires `touchend` on the second thought but does NOT fire a
// `focus` event on it (and the synthesized `click` retargets to the first thought). Because
// `handleTapBehavior` defers cursor-setting to `onFocus` whenever `editingOrOnCursor` is true
// (and `editingOrOnCursor` is true whenever the keyboard is open), the second tap hits the
// "no-op (cursor set via onFocus)" branch and the cursor is never moved — it stays stuck on the
// first thought. This is the exact mechanism behind #4173.
//
// This test reproduces the bug at the handler level (a pure synthetic-touch e2e cannot: WebDriver
// taps force focus onto the target, which bypasses the real-finger rapid-tap focus suppression).
// It marks the first thought as the cursor with the keyboard open (the state left by the first
// tap), then fires `touchend` on the adjacent thought and asserts the cursor moves to it.
//
// It is currently expected to FAIL (hence `it.fails`), documenting the unfixed bug. When #4173 is
// fixed — by setting the cursor directly on `touchend` for a visible non-cursor thought instead of
// relying solely on `onFocus` — this test will start passing; remove `.fails` at that point so it
// becomes a live regression guard.
it.fails('tapping an adjacent thought while the keyboard is open moves the cursor (#4173)', async () => {
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

  // Simulate the state left by the first tap: cursor on `a`, keyboard open.
  await dispatch([setCursor(['a']), keyboardOpen({ value: true })])
  await act(vi.runOnlyPendingTimersAsync)

  // The second tap lands on the adjacent thought `b`. On iOS this fires `touchend` but not `focus`.
  const editableB = (await findThoughtByText('b'))!
  expect(editableB).toBeTruthy()
  await act(async () => {
    fireEvent.touchEnd(editableB)
  })
  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()
  expect(state.cursor && headValue(state, state.cursor)).toBe('b')
})
