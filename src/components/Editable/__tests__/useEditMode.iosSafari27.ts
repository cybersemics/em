import { fireEvent, renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider, useSelector } from 'react-redux'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../actions/keyboardOpen'
import * as selection from '../../../device/selection'
import contextToPath from '../../../selectors/contextToPath'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import equalPath from '../../../util/equalPath'
import head from '../../../util/head'
import initEvents from '../../../util/initEvents'
import pathToContext from '../../../util/pathToContext'
import useEditMode from '../useEditMode'

// Emulate Safari on iOS 27, which can withhold a tap's touchend until the next touch (#5660).
vi.mock('../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../browser')>()
  return {
    ...actual,
    isTouch: true,
    isSafari: () => true,
    isSafari27OrLater: true,
  }
})

let cleanupEvents: () => void

beforeEach(async () => {
  await initStore()
  cleanupEvents = initEvents(store).cleanup
})

afterEach(() => cleanupEvents())

/** Renders useEditMode on a new editable for the thought with the given value, editing whenever it is the cursor, as Editable does. */
const renderEditable = (value: string) => {
  const path = contextToPath(store.getState(), [value])!
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.setAttribute('data-editable', '')
  editable.setAttribute('aria-label', `editable-${head(path)}`)
  editable.textContent = value
  document.body.appendChild(editable)

  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: useSelector(state => equalPath(state.cursor, path)),
        path,
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  return editable
}

it('a quick tap on another thought moves the cursor when iOS withholds its touchend and retargets its mouse events', () => {
  store.dispatch([importText({ text: '- One\n- Two' }), setCursor(['One']), keyboardOpen({ value: true })])
  const one = renderEditable('One')
  const two = renderEditable('Two')

  // a tap on One
  act(() => {
    fireEvent.touchStart(one, { touches: [{ clientX: 0, clientY: 0 }], changedTouches: [{ clientX: 0, clientY: 0 }] })
    fireEvent.touchEnd(one, { changedTouches: [{ clientX: 0, clientY: 0 }] })
  })

  // A quick tap on Two. iOS withholds its touchend, and fires its mousedown and mouseup on One, the thought it left.
  act(() => {
    fireEvent.touchStart(two, { touches: [{ clientX: 0, clientY: 0 }], changedTouches: [{ clientX: 0, clientY: 0 }] })
  })
  let mousedownPrevented = false
  act(() => {
    mousedownPrevented = !fireEvent.mouseDown(one)
    fireEvent.mouseUp(one)
  })

  // the retargeted mousedown must not put the caret back on One
  expect(mousedownPrevented).toBe(true)
  expect(pathToContext(store.getState(), store.getState().cursor!)).toEqual(['Two'])
})

it('leaves the caret to iOS while it is handling a tap whose touchend is withheld', () => {
  store.dispatch([importText({ text: '- One\n- Two' }), setCursor(['One']), keyboardOpen({ value: true })])
  renderEditable('One')
  const two = renderEditable('Two')

  // A tap on Two whose touchend iOS withholds. Its mousedown focuses Two natively, which clears the old caret and
  // makes Two the cursor, and iOS places the new caret at the mouseup.
  act(() => {
    fireEvent.touchStart(two, { touches: [{ clientX: 0, clientY: 0 }], changedTouches: [{ clientX: 0, clientY: 0 }] })
    fireEvent.mouseDown(two)
    selection.clear()
    store.dispatch(setCursor(['Two']))
  })

  // em setting the selection now would make iOS swallow the next quick tap
  expect(selection.isOnEditable(head(contextToPath(store.getState(), ['Two'])!))).toBe(false)

  act(() => {
    selection.set(two.firstChild, { offset: 2 })
    fireEvent.mouseUp(two)
    vi.runOnlyPendingTimers()
  })

  // the caret stays where iOS placed it
  expect(selection.offset()).toBe(2)
})

it('places the caret after the mouseup when iOS does not', () => {
  store.dispatch([importText({ text: '- One\n- Two' }), setCursor(['One']), keyboardOpen({ value: true })])
  renderEditable('One')
  const two = renderEditable('Two')

  act(() => {
    fireEvent.touchStart(two, { touches: [{ clientX: 0, clientY: 0 }], changedTouches: [{ clientX: 0, clientY: 0 }] })
    fireEvent.mouseDown(two)
    selection.clear()
    store.dispatch(setCursor(['Two']))
  })
  act(() => {
    fireEvent.mouseUp(two)
    vi.runOnlyPendingTimers()
  })

  expect(selection.isOnEditable(head(contextToPath(store.getState(), ['Two'])!))).toBe(true)
})
