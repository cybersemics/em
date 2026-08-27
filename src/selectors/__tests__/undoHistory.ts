import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { undoActionCreator as undo } from '../../actions/undo'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import undoHistory from '../undoHistory'

beforeEach(initStore)

/** Returns the source id of every patch in the history, newest first. */
const patchSources = () =>
  undoHistory(store.getState()).patches.map(patch =>
    patch.metadata.source === 'command' ? patch.metadata.commandId : patch.metadata.actionType,
  )

it('treat each patch as one history step', () => {
  store.dispatch([newThought({}), editThought([''], 'a')])

  expect(patchSources()).toEqual(['editThought', 'newThought'])
  expect(undoHistory(store.getState()).position).toBe(0)
})

it('counts patches on the redo stack as the current position', () => {
  store.dispatch([newThought({}), editThought([''], 'a'), undo({ count: 1 })])

  expect(patchSources()).toEqual(['editThought', 'newThought'])
  expect(undoHistory(store.getState()).position).toBe(1)
})
