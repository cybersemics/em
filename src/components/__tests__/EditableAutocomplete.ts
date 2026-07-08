import { render } from '@testing-library/react'
import { act, createElement, createRef } from 'react'
import { Provider } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import { clearActionCreator as clear } from '../../actions/clear'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import { HOME_TOKEN } from '../../constants'
import * as db from '../../data-providers/yjs/thoughtspace'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import getLexeme from '../../selectors/getLexeme'
import store from '../../stores/app'
import storage from '../../util/storage'
import Editable from '../Editable'

// The iOS autocomplete retargeting handler in Editable is only registered on touch Safari.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true, isSafari: () => true }
})

let cleanup: (() => void) | undefined

beforeEach(async () => {
  await act(async () => {
    vi.useFakeTimers({ loopLimit: 100000 })
    const init = await initialize()
    cleanup = init.cleanup
  })
})

afterEach(async () => {
  await act(async () => {
    storage.clear()
    cleanup?.()
    store.dispatch(clear({ full: true }))
    await vi.runAllTimersAsync()
    db.clear()
    await vi.runAllTimersAsync()
    window.history.pushState({}, '', '/')
    await vi.runAllTimersAsync()
  })
  vi.useRealTimers()
})

// Regression test for an infinite loop introduced by #4467.
// After iOS autocomplete replaces a word (insertReplacementText) and inserts a trailing space (insertText),
// the handler must persist the corrected value with the *previous* value as the edit baseline. A previous
// implementation overwrote oldValueRef with the new value before flushing, which made editThought a no-op and
// left the original value's Lexeme orphaned (referencing a thought whose value had changed). That inconsistency
// corrupts the thoughtspace and manifests as a freeze and a blank screen on reload.
//
// Editable is rendered in isolation (rather than mounting the full App via createTestApp) because the touch
// chrome (Toolbar/useLongPress, framer-motion) crashes under jsdom when isTouch is mocked true.
it('persists iOS autocomplete without orphaning the original Lexeme', async () => {
  await act(async () => {
    store.dispatch(importText({ text: '- Adf' }))
    await vi.runOnlyPendingTimersAsync()
  })

  const simplePath = contextToPath(store.getState(), ['Adf']) as SimplePath
  expect(simplePath).toBeTruthy()

  await act(async () => {
    store.dispatch(setCursor({ path: simplePath }))
    await vi.runOnlyPendingTimersAsync()
  })

  // The mistyped word is stored as a Lexeme.
  expect(getLexeme(store.getState(), 'Adf')).toBeDefined()

  const editableRef = createRef<HTMLInputElement>()
  await act(async () => {
    render(
      createElement(Provider, {
        store,
        children: createElement(Editable, {
          editableRef,
          path: simplePath,
          simplePath,
          isEditing: true,
          isVisible: true,
        }),
      }),
    )
    await vi.runOnlyPendingTimersAsync()
  })

  const editable = editableRef.current!
  expect(editable).toBeTruthy()

  await act(async () => {
    editable.focus()
    await vi.runOnlyPendingTimersAsync()
  })

  // Simulate iOS autocomplete. The OS mutates the DOM itself; jsdom does not, so set the content manually
  // before dispatching each input event. insertReplacementText replaces the word, then insertText adds a space.
  // Both events must fire before the edit throttle (EDIT_THROTTLE) elapses — as they do on a real device —
  // so do NOT advance timers between them, otherwise the queued edit flushes early and masks the bug.
  await act(async () => {
    editable.innerHTML = 'All'
    editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: 'All' }))

    editable.innerHTML = 'All '
    editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' ' }))

    await vi.runAllTimersAsync()
  })

  // The autocompleted value is persisted.
  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - All`)

  // The original "Adf" Lexeme must be removed, not orphaned.
  expect(getLexeme(store.getState(), 'Adf')).toBeUndefined()
  expect(getLexeme(store.getState(), 'All')).toBeDefined()
})
