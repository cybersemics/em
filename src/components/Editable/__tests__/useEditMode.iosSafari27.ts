import { fireEvent, renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../actions/keyboardOpen'
import contextToPath from '../../../selectors/contextToPath'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
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

/** Renders useEditMode on a new editable for the thought with the given value. */
const renderEditable = (value: string) => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = value
  document.body.appendChild(editable)

  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: false,
        path: contextToPath(store.getState(), [value])!,
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
