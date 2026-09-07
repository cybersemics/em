import { renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../actions/importText'
import { updateHoveringPathActionCreator as updateHoveringPath } from '../../actions/updateHoveringPath'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import useDragLeave from '../useDragLeave'

/** Renders useDragLeave against the app store. */
const renderDragLeave = (props: { isDeepHovering: boolean; canDropThought: boolean }) =>
  renderHook((propsNew: { isDeepHovering: boolean; canDropThought: boolean }) => useDragLeave(propsNew), {
    initialProps: props,
    wrapper: ({ children }) => createElement(Provider, { store, children }),
  })

/** Imports two thoughts and sets hoveringPath to the first, as if a drag were in progress over it. */
const startHovering = () => {
  store.dispatch(importText({ text: '- a\n- b' }))
  store.dispatch(updateHoveringPath({ path: contextToPath(store.getState(), ['a'])! }))
}

/** Advances past the hook's 50ms debounce. */
const flushDebounce = () => act(() => vi.advanceTimersByTimeAsync(100))

beforeEach(async () => {
  await initStore()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('keeps hoveringPath while a drop target is hovered and an unrelated thought mounts', async () => {
  startHovering()

  // the cursor enters a drop target
  const target = renderDragLeave({ isDeepHovering: false, canDropThought: true })
  target.rerender({ isDeepHovering: true, canDropThought: true })

  // an unrelated thought mounts while the drag is still over the target
  renderDragLeave({ isDeepHovering: false, canDropThought: true })

  await flushDebounce()

  expect(store.getState().hoveringPath).toBeDefined()
})

// Guards against over-correcting the hover count: ignoring mounts must not leave the count stuck above zero, or
// hoveringPath would never be cleared.
it('still clears hoveringPath after an unrelated thought mounts and the cursor leaves', async () => {
  startHovering()

  const target = renderDragLeave({ isDeepHovering: false, canDropThought: true })
  target.rerender({ isDeepHovering: true, canDropThought: true })
  renderDragLeave({ isDeepHovering: false, canDropThought: true })
  target.rerender({ isDeepHovering: false, canDropThought: true })

  await flushDebounce()

  expect(store.getState().hoveringPath).toBeUndefined()
})

it('clears hoveringPath once the cursor leaves the drop target', async () => {
  startHovering()

  const target = renderDragLeave({ isDeepHovering: false, canDropThought: true })
  target.rerender({ isDeepHovering: true, canDropThought: true })
  target.rerender({ isDeepHovering: false, canDropThought: true })

  await flushDebounce()

  expect(store.getState().hoveringPath).toBeUndefined()
})

it('clears hoveringPath when a hovered drop target unmounts', async () => {
  startHovering()

  const target = renderDragLeave({ isDeepHovering: false, canDropThought: true })
  target.rerender({ isDeepHovering: true, canDropThought: true })
  target.unmount()

  await flushDebounce()

  expect(store.getState().hoveringPath).toBeUndefined()
})
