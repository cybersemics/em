import Path from '../../@types/Path'
import Thought from '../../@types/Thought'
import Timestamp from '../../@types/Timestamp'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursorPath } from '../../actions/setCursor'
import { updateThoughtsActionCreator as updateThoughts } from '../../actions/updateThoughts'
import { HOME_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import contextToPath from '../../selectors/contextToPath'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { moveThoughtAtFirstMatchActionCreator as moveThought } from '../../test-helpers/moveThoughtAtFirstMatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import createId from '../../util/createId'

beforeEach(initStore)

it('moves an invalid cursor back to the last valid cursor', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - g
          - a
            - x
          - b`,
    }),
    setCursor(['g', 'a']),
  ])

  // a path that was valid before x was moved, such as one held by a stale history entry
  const pathBefore = contextToPath(store.getState(), ['g', 'a', 'x'])!

  store.dispatch(moveThought({ from: ['g', 'a', 'x'], to: ['g', 'b', 'x'], newRank: 0 }))

  // set the cursor to x where it was rather than where it is now
  store.dispatch(setCursorPath({ path: pathBefore }))

  const state = store.getState()
  expect(state.cursor).toEqual(contextToPath(state, ['g', 'a']))
})

/** Applies thoughts the way a sync from storage does. A synced thought only replaces one in the state if it is newer, so pass a later lastUpdated (see later). */
const sync = (...thoughts: Thought[]) =>
  updateThoughts({
    thoughtIndexUpdates: Object.fromEntries(thoughts.map(thought => [thought.id, thought])),
    lexemeIndexUpdates: {},
    local: false,
    remote: false,
    repairCursor: true,
  })

/** Returns a timestamp n milliseconds after the given thought was last updated. */
const later = (thought: Thought, n: number) => (thought.lastUpdated + n) as Timestamp

it('keeps the cursor while a stale copy of its thought is under a parent that is not loaded yet', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - g
          - a
            - x`,
    }),
    setCursor(['g', 'a', 'x']),
  ])

  const cursor = store.getState().cursor
  const x = getThoughtById(store.getState(), contextToThoughtId(store.getState(), ['g', 'a', 'x'])!)!

  const cursors: (Path | null)[] = []
  const unsubscribe = store.subscribe(() => cursors.push(store.getState().cursor))

  // a stale copy of x loads first, under a parent that has not been pulled
  store.dispatch(sync({ ...x, parentId: createId(), lastUpdated: later(x, 1) }))
  // then the current copy arrives
  store.dispatch(sync({ ...x, lastUpdated: later(x, 2) }))

  unsubscribe()

  expect(cursors).not.toContain(null)
  expect(store.getState().cursor).toEqual(cursor)
})

it('moves the cursor to the new location of its thought once the new parent loads', async () => {
  await initialize({ storage: 'memory' })

  store.dispatch([
    importText({
      text: `
        - g
          - a
            - x`,
    }),
    setCursor(['g', 'a', 'x']),
  ])

  const x = getThoughtById(store.getState(), contextToThoughtId(store.getState(), ['g', 'a', 'x'])!)!
  const p = createId()

  // x was moved on another device to a parent that has not been pulled yet
  store.dispatch(sync({ ...x, parentId: p, lastUpdated: later(x, 1) }))
  expect(store.getState().cursor).not.toBeNull()

  // the new parent loads
  store.dispatch(
    sync({
      ...getThoughtById(store.getState(), contextToThoughtId(store.getState(), ['g'])!)!,
      id: p,
      value: 'p',
      parentId: HOME_TOKEN,
      childrenMap: { [x.id]: x.id },
    }),
  )

  expect(store.getState().cursor).toEqual([p, x.id])
})
