import { clearActionCreator as clear } from '../../actions/clear'
import { importTextActionCreator as importText } from '../../actions/importText'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import db from '../../data-providers/thoughtspace'
import { initialize } from '../../initialize'
import exportContext from '../../selectors/exportContext'
import getFavoriteIds from '../../selectors/getFavoriteIds'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import { refreshTestApp } from '../../test-helpers/createTestApp'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import initialState from '../../util/initialState'

let cleanup: () => void

/** Exports the canonical document independently of Redux's published thoughts and navigation. */
const exportDocument = () => exportContext({ ...initialState(), thoughts: db.project() }, [HOME_TOKEN], 'text/plain')

beforeEach(async () => {
  await initStore()
  ;({ cleanup } = await initialize({ storage: 'memory' }))
  await vi.runOnlyPendingTimersAsync()
})

afterEach(async () => {
  cleanup()
  await vi.runAllTimersAsync()
  await waitForThoughtspaceIdle()
})

it('explicit clearing deletes the document and stays deleted after republication', async () => {
  await store.dispatch(importText({ text: '- a\n  - b\n    - c' }))
  await store.dispatch(clear({ persist: true }))

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}`)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}`)

  await refreshTestApp()

  expect(exportDocument()).toBe(`- ${HOME_TOKEN}`)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}`)
})

it('clear resets navigation without evicting the complete document', async () => {
  store.dispatch(newThought({ value: 'a' }))
  await vi.runOnlyPendingTimersAsync()
  const thoughtA = contextToThought(store.getState(), ['a'])!
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - a`)

  store.dispatch(clear())

  expect(store.getState().cursor).toBeNull()
  expect(store.getState().thoughts.thoughtIndex[thoughtA.id]).toEqual(thoughtA)
  expect(store.getState().isLoading).toBe(false)
  expect(exportDocument()).toBe(`- ${HOME_TOKEN}
  - a`)

  await refreshTestApp()

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - a`)
  expect(contextToThought(store.getState(), ['a'])!.id).toBe(thoughtA.id)
})

it('keeps deep favorite contexts available after republication and clearing navigation', async () => {
  await store.dispatch(importText({ text: '- x\n- a\n  - b\n    - c\n      - =favorite' }))
  const favorite = contextToThought(store.getState(), ['a', 'b', 'c', '=favorite'])!
  expect(favorite).toBeTruthy()
  store.dispatch(setCursor(['x']))

  await refreshTestApp()

  expect(getFavoriteIds(store.getState())).toEqual([favorite.id])
  expect(contextToThought(store.getState(), ['a', 'b', 'c'])?.id).toBe(favorite.parentId)

  store.dispatch(clear())

  expect(getFavoriteIds(store.getState())).toEqual([favorite.id])

  await refreshTestApp()

  expect(getFavoriteIds(store.getState())).toEqual([favorite.id])
  expect(contextToThought(store.getState(), ['a', 'b', 'c'])?.id).toBe(favorite.parentId)
})
