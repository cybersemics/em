import { clearActionCreator as clear } from '../../actions/clear'
import { redoActionCreator as redo } from '../../actions/redo'
import { settingsActionCreator as settings } from '../../actions/settings'
import { undoActionCreator as undo } from '../../actions/undo'
import { initialize } from '../../initialize'
import store from '../../stores/app'
import contextToPathOrThrow from '../../test-helpers/contextToPathOrThrow'
import { deleteThoughtAtFirstMatchActionCreator as deleteThought } from '../../test-helpers/deleteThoughtAtFirstMatch'
import importToContext from '../../test-helpers/importToContext'
import initStore from '../../test-helpers/initStore'
import waitForThoughtspaceIdle from '../../test-helpers/waitForThoughtspaceIdle'
import head from '../../util/head'
import getFavoriteIds from '../getFavoriteIds'

beforeEach(initStore)

it('restores saved favorite order through undo, redo, and reinitialization', async () => {
  store.dispatch(importToContext('- a\n  - =favorite\n- b\n  - =favorite\n- c\n  - =favorite'))
  const original = getFavoriteIds(store.getState())
  expect(original).toHaveLength(3)
  const reordered = [original[2], original[0], original[1]]

  store.dispatch(settings({ key: 'Favorites Order', value: JSON.stringify(reordered) }))
  expect(getFavoriteIds(store.getState())).toEqual(reordered)

  store.dispatch(undo())
  expect(getFavoriteIds(store.getState())).toEqual(original)
  store.dispatch(redo())
  expect(getFavoriteIds(store.getState())).toEqual(reordered)

  await waitForThoughtspaceIdle()
  store.dispatch(clear())
  await initialize({ storage: 'memory' })
  expect(getFavoriteIds(store.getState())).toEqual(reordered)
})

it('deduplicates saved ids, drops deleted favorites, and appends new favorites in creation order', () => {
  store.dispatch(importToContext('- a\n  - =favorite'))
  const a = head(contextToPathOrThrow(store.getState(), ['a', '=favorite'], 'favorite marker'))
  vi.advanceTimersByTime(1)
  store.dispatch(importToContext('- b\n  - =favorite'))
  const b = head(contextToPathOrThrow(store.getState(), ['b', '=favorite'], 'favorite marker'))
  expect(getFavoriteIds(store.getState())).toEqual([a, b])

  store.dispatch(settings({ key: 'Favorites Order', value: JSON.stringify([b, b, 'missing', 42]) }))
  expect(getFavoriteIds(store.getState())).toEqual([b, a])

  store.dispatch(deleteThought(['b']))
  vi.advanceTimersByTime(1)
  store.dispatch(importToContext('- c\n  - =favorite\n- d\n  - =favorite'))
  const c = head(contextToPathOrThrow(store.getState(), ['c', '=favorite'], 'favorite marker'))
  const d = head(contextToPathOrThrow(store.getState(), ['d', '=favorite'], 'favorite marker'))
  expect(getFavoriteIds(store.getState())).toEqual([a, ...[c, d].sort()])
})

it.each(['not json', '{"order":[]}', 'null'])('falls back to creation order for malformed setting %s', value => {
  store.dispatch(importToContext('- a\n  - =favorite'))
  const a = head(contextToPathOrThrow(store.getState(), ['a', '=favorite'], 'favorite marker'))
  vi.advanceTimersByTime(1)
  store.dispatch(importToContext('- b\n  - =favorite'))
  const b = head(contextToPathOrThrow(store.getState(), ['b', '=favorite'], 'favorite marker'))

  store.dispatch(settings({ key: 'Favorites Order', value }))

  expect(getFavoriteIds(store.getState())).toEqual([a, b])
})
