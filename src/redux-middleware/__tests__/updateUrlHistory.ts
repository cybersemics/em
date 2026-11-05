import { act } from 'react'
import { cursorBackActionCreator as cursorBack } from '../../actions/cursorBack'
import { deleteThoughtWithCursorActionCreator as deleteThoughtWithCursor } from '../../actions/deleteThoughtWithCursor'
import { freeThoughtsActionCreator as freeThoughts } from '../../actions/freeThoughts'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { toggleContextViewActionCreator as toggleContextView } from '../../actions/toggleContextView'
import { unfoldContextActionCreator as unfoldContext } from '../../actions/unfoldContext'
import store from '../../stores/app'
import freeThoughtsThresholdStore from '../../stores/freeThoughtsThresholdStore'
import storageModel from '../../stores/storageModel'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import contextToThought from '../../test-helpers/contextToThought'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import importToContext from '../../test-helpers/importToContext'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
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

it('persists an unfolded cursor at its actual location without saving its hidden anchor', async () => {
  await dispatch(
    importToContext(`
- Source
  - Shared
- Archive
  - Topics
    - Shared
      - Target detail
`),
  )
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  await act(() => vi.runAllTimersAsync())
  const owner = store.getState().cursor!
  const destination = contextToThought(store.getState(), ['Archive', 'Topics', 'Shared'])!
  const ancestor = contextToThought(store.getState(), ['Archive'])!

  await dispatch(unfoldContext({ contextViewPath: owner, contextId: destination.id, ancestorId: ancestor.id }))
  await act(() => vi.runAllTimersAsync())

  expect(window.location.pathname).toBe(`/~/${ancestor.id}`)
  expect(storageModel.get('cursor').path).toEqual([ancestor.id])
  expect(store.getState().cursor).toEqual([...owner, destination.id, ancestor.id])
})

it('omits a live cyclic portal marker when persisting its unfolded ordinary destination', async () => {
  await dispatch(
    importToContext(`
- Source
  - Shared
    - Source detail
- Archive
  - Shared
`),
  )
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  await act(() => vi.runAllTimersAsync())
  const owner = store.getState().cursor!
  const source = contextToThought(store.getState(), ['Source'])!
  const shared = contextToThought(store.getState(), ['Source', 'Shared'])!
  const detail = contextToThought(store.getState(), ['Source', 'Shared', 'Source detail'])!
  await dispatch(unfoldContext({ contextViewPath: owner, contextId: shared.id, ancestorId: source.id }))
  await dispatch(setCursorPath({ path: [...store.getState().cursor!, shared.id, detail.id] }))
  await act(() => vi.runAllTimersAsync())

  expect(window.location.pathname).toBe(`/~/${source.id}/${shared.id}/${detail.id}`)
  expect(storageModel.get('cursor').path).toEqual([source.id, shared.id, detail.id])
  expect(store.getState().contextViews[owner.join('')]).toBe(true)
})

it('saves the ordinary unfolded cursor even when its canonical URL is already displayed', async () => {
  await dispatch(
    importToContext(`
- Source
  - Shared
- Archive
  - Shared
`),
  )
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  await act(() => vi.runAllTimersAsync())
  const owner = store.getState().cursor!
  const destination = contextToThought(store.getState(), ['Archive', 'Shared'])!
  const archive = contextToThought(store.getState(), ['Archive'])!
  window.history.replaceState({}, '', `/~/${archive.id}`)
  const previousLength = window.history.length

  await dispatch(unfoldContext({ contextViewPath: owner, contextId: destination.id, ancestorId: archive.id }))
  await act(() => vi.runAllTimersAsync())

  expect(window.location.pathname).toBe(`/~/${archive.id}`)
  expect(window.history.length).toBe(previousLength)
  expect(storageModel.get('cursor').path).toEqual([archive.id])
})

it('updates the canonical URL when a move changes real ancestry without changing the unfolded cursor route', async () => {
  await dispatch(
    importToContext(`
- Source
  - Shared
- Archive
  - Section
    - Topics
      - Shared
- Other
`),
  )
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  const owner = store.getState().cursor!
  const destination = contextToThought(store.getState(), ['Archive', 'Section', 'Topics', 'Shared'])!
  const topics = contextToThought(store.getState(), ['Archive', 'Section', 'Topics'])!
  const section = contextToThought(store.getState(), ['Archive', 'Section'])!
  const other = contextToThought(store.getState(), ['Other'])!
  await dispatch(unfoldContext({ contextViewPath: owner, contextId: destination.id, ancestorId: topics.id }))
  await act(() => vi.runAllTimersAsync())
  const displayedRoute = store.getState().cursor

  await dispatch(moveThought({ from: ['Archive', 'Section'], to: ['Other', 'Section'], newRank: 0 }))
  await act(() => vi.runAllTimersAsync())

  expect(store.getState().cursor).toEqual(displayedRoute)
  expect(window.location.pathname).toBe(`/~/${other.id}/${section.id}/${topics.id}`)
  expect(storageModel.get('cursor').path).toEqual([other.id, section.id, topics.id])
})

it('preserves marked URLs and cursor storage for ordinary collapsed context routes', async () => {
  await dispatch(
    importToContext(`
- Source
  - Shared
- Archive
  - Shared
`),
  )
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  const owner = store.getState().cursor!
  const archive = contextToThought(store.getState(), ['Archive'])!
  await dispatch(setCursorPath({ path: [...owner, archive.id] }))
  await act(() => vi.runAllTimersAsync())

  expect(window.location.pathname).toBe(`/~/${owner[0]}/${owner[1]}~/${archive.id}`)
  expect(storageModel.get('cursor').path).toEqual([...owner, archive.id])
})

it('saves a canonical unfolded cursor through the selection-offset writer', async () => {
  await dispatch(
    importToContext(`
- Source
  - Shared
- Archive
  - Shared
`),
  )
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  const owner = store.getState().cursor!
  const destination = contextToThought(store.getState(), ['Archive', 'Shared'])!
  const archive = contextToThought(store.getState(), ['Archive'])!
  await dispatch(unfoldContext({ contextViewPath: owner, contextId: destination.id, ancestorId: archive.id }))
  await act(() => vi.runAllTimersAsync())
  storageModel.remove('cursor')

  document.dispatchEvent(new Event('selectionchange'))
  await act(() => vi.runAllTimersAsync())

  expect(storageModel.get('cursor').path).toEqual([archive.id])
})

it('persists ordinary jump targets after their unfolded portal registry has closed', async () => {
  await dispatch(
    importToContext(`
- Source
  - Shared
    - Source detail
- Archive
  - Topics
    - Shared
      - Target detail
`),
  )
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  const owner = store.getState().cursor!
  const destination = contextToThought(store.getState(), ['Archive', 'Topics', 'Shared'])!
  const archive = contextToThought(store.getState(), ['Archive'])!
  const topics = contextToThought(store.getState(), ['Archive', 'Topics'])!
  const detail = contextToThought(store.getState(), ['Archive', 'Topics', 'Shared', 'Target detail'])!
  await dispatch(unfoldContext({ contextViewPath: owner, contextId: destination.id, ancestorId: archive.id }))
  await dispatch(setCursorPath({ path: [...store.getState().cursor!, topics.id, destination.id, detail.id] }))
  await dispatch(editThought(['Archive', 'Topics', 'Shared', 'Target detail'], 'Target revised'))
  await act(() => vi.runAllTimersAsync())
  const physicalTarget = contextToPathOrThrow(
    store.getState(),
    ['Archive', 'Topics', 'Shared', 'Target revised'],
    'serialized jump target',
  )
  expect(store.getState().jumpHistory.find(path => path?.at(-1) === detail.id)).toEqual(physicalTarget)
  await dispatch(setCursor(['Source', 'Shared']))
  await dispatch(toggleContextView())
  await dispatch(setCursor(['Source', 'Shared', 'Source detail']))
  await dispatch(editThought(['Source', 'Shared', 'Source detail'], 'Source revised'))
  await act(() => vi.runAllTimersAsync())

  expect(storageModel.get('jumpHistory').find(path => path?.at(-1) === detail.id)).toEqual(physicalTarget)
})

it('preserves an older valid jump target after its thought is evicted from the cache', async () => {
  await dispatch(
    importToContext(`
- A
  - a
    - Old target
- B
  - b
    - B target
- C
  - c
    - C target
- D
  - d
    - D target
- E
  - e
    - E target
`),
  )
  await dispatch(setCursor(['A', 'a', 'Old target']))
  await dispatch(editThought(['A', 'a', 'Old target'], 'Old edited'))
  await act(() => vi.runAllTimersAsync())
  const originalPath = contextToPathOrThrow(store.getState(), ['A', 'a', 'Old edited'], 'older jump target')
  const originalId = originalPath.at(-1)!
  await dispatch(setCursor(['B', 'b', 'B target']))
  await dispatch(editThought(['B', 'b', 'B target'], 'B edited'))
  await dispatch(setCursor(['C', 'c', 'C target']))
  await dispatch(editThought(['C', 'c', 'C target'], 'C edited'))
  await dispatch(setCursor(['D', 'd', 'D target']))
  await dispatch(editThought(['D', 'd', 'D target'], 'D edited'))
  await dispatch(setCursor(['E', 'e', 'E target']))
  await dispatch(editThought(['E', 'e', 'E target'], 'E edited'))
  await act(() => vi.runAllTimersAsync())
  freeThoughtsThresholdStore.update(0)
  await dispatch(freeThoughts())
  await act(() => vi.runAllTimersAsync())
  expect(store.getState().thoughts.thoughtIndex[originalId]).toBeUndefined()

  await dispatch(editThought(['E', 'e', 'E edited'], 'E edited again'))
  await act(() => vi.runAllTimersAsync())

  expect(storageModel.get('jumpHistory').find(path => path?.at(-1) === originalId)).toEqual(originalPath)
})
