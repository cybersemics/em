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

  const thoughtA = contextToThought(store.getState(), ['a'])!
  await expectPathnameToBe(`/~/${thoughtA.id}`)

  await dispatch(newThought({ value: 'b', insertNewSubthought: true }))

  const thoughtB = contextToThought(store.getState(), ['a', 'b'])!
  await expectPathnameToBe(`/~/${thoughtA.id}/${thoughtB.id}`)

  await dispatch(cursorBack())
  await expectPathnameToBe(`/~/${thoughtA.id}`)

  await dispatch(cursorBack())

  await expectPathnameToBe('/')
})

it('set url to home after deleting last empty thought', async () => {
  await dispatch(newThought({}))

  const thoughtA = contextToThought(store.getState(), [''])!
  expectPathnameToBe(`/~/${thoughtA.id}`)

  await dispatch(deleteThoughtWithCursor({}))
  expectPathnameToBe('/')
})

/** Wait until the URL changes to the given path. */
async function expectPathnameToBe(path: string) {
  await vi.waitUntil(() => window.location.pathname === path, { timeout: 500 })
  expect(window.location.pathname).toBe(path)
}
