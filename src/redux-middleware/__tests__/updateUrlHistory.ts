import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('set url to cursor', async () => {
  await dispatch(newThought({ value: 'a' }))
  vi.runOnlyPendingTimers()

  const thoughtA = contextToThought(store.getState(), ['a'])!
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}`)

  await dispatch(newThought({ value: 'b', insertNewSubthought: true }))
  vi.runOnlyPendingTimers()

  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}/${thoughtB.id}`)

  await dispatch(cursorBack())
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}`)

  await dispatch(cursorBack())
  vi.runOnlyPendingTimers()

  expect(window.location.pathname).toBe('/')
})

it('set url to home after deleting last empty thought', async () => {
  await dispatch(newThought({}))
  vi.runOnlyPendingTimers()

  const thoughtA = contextToThought(store.getState(), [''])!
  expect(window.location.pathname).toBe(`/~/${thoughtA.id}`)

  await dispatch(deleteThoughtWithCursor({}))
  expect(window.location.pathname).toBe('/')
})
