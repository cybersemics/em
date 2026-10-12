import { act } from 'react'
import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('set url to cursor', async () => {
  await dispatch(newThought({ value: 'a' }))
  await act(() => vi.runAllTimersAsync())

  const thoughtA = contextToThought(store.getState(), ['a'])!
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}`)

  await dispatch(newThought({ value: 'b', insertNewSubthought: true }))
  await act(() => vi.runAllTimersAsync())

  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}/${thoughtB.id}`)

  await dispatch(cursorBack())
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}`)

  await dispatch(cursorBack())
  await act(() => vi.runAllTimersAsync())

  expect(window.location.pathname).toBe('/')
})

it('set url to home after deleting last empty thought', async () => {
  await dispatch(newThought({}))
  await act(() => vi.runAllTimersAsync())

  const thoughtA = contextToThought(store.getState(), [''])!
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}`)

  await dispatch(deleteThoughtWithCursor())
  await act(vi.runOnlyPendingTimersAsync)

  expect(window.location.pathname).toBe('/')
})

// https://github.com/cybersemics/em/issues/5747
it('preserve forward history after navigating back to the home page', async () => {
  await dispatch(newThought({ value: 'aaa' }))
  await act(() => vi.runAllTimersAsync())
  await dispatch(newThought({ value: 'bbb' }))
  await act(() => vi.runAllTimersAsync())
  await dispatch(newThought({ value: 'ccc' }))
  await act(() => vi.runAllTimersAsync())

  window.history.back()
  await act(() => vi.runAllTimersAsync())
  window.history.back()
  await act(() => vi.runAllTimersAsync())
  window.history.back()
  await act(() => vi.runAllTimersAsync())

  expect(window.location.pathname).toBe('/')

  window.history.forward()
  await act(() => vi.runAllTimersAsync())

  const thoughtA = contextToThought(store.getState(), ['aaa'])!
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}`)
})

it('push the cursor after navigating back and returning to the previous thought within the throttle window', async () => {
  await dispatch(newThought({ value: 'aaa' }))
  await act(() => vi.runAllTimersAsync())
  await dispatch(newThought({ value: 'bbb' }))
  await act(() => vi.runAllTimersAsync())

  // start the throttle window so that the cursor change from Back is not written immediately
  await dispatch(setCursor(['bbb']))

  // return to bbb in the same tick that Back moves the cursor to aaa
  window.addEventListener('popstate', () => store.dispatch(setCursor(['bbb'])), { once: true })
  window.history.back()
  await act(() => vi.runAllTimersAsync())

  const thoughtB = contextToThought(store.getState(), ['bbb'])!
  expect(store.getState().cursor).toEqual([thoughtB.id])
  expect(window.location.pathname).toBe(`/~/${thoughtB.id}`)
})
