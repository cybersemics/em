import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import newThought from '../actions/newThought'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild } from '../selectors/getChildren'
import appendToPath from '../util/appendToPath'
import getPublishUrl from '../util/getPublishUrl'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Inserts a new revision from the given CID at the top of {path}/=publish/Revisions. */
const prependRevision = (state: State, { path, cid }: { path: Path; cid: string }) => {
  /** Gets the =publish thought. */
  const publishChild = (state: State) => findAnyChild(state, head(path), child => child.value === '=publish')

  /** Gets the =publish/Revisions thought. */
  const revisionsChild = (state: State): Thought | null => {
    const publishId = findDescendant(state, head(path), '=publish')
    if (!publishId) return null
    return findAnyChild(state, publishId, child => child.value === 'Revisions') || null
  }

  return reducerFlow([
    // insert =publish if it does not exist
    // save the rank for revisions insertion
    state =>
      !publishChild(state)
        ? newThought(state, {
            at: path,
            insertNewSubthought: true,
            insertBefore: true,
            value: '=publish',
            preventSetCursor: true,
          })
        : state,

    // insert Revisions if it does not exist
    // save the rank for url insertion
    state =>
      !revisionsChild(state)
        ? newThought(state, {
            at: appendToPath(path, publishChild(state)!.id),
            insertNewSubthought: true,
            insertBefore: true,
            value: 'Revisions',
            preventSetCursor: true,
          })
        : state,

    // insert revision url
    newThought({
      at: appendToPath(path, publishChild(state)!.id, revisionsChild(state)!.id),
      insertNewSubthought: true,
      insertBefore: true,
      value: getPublishUrl(cid),
      preventSetCursor: true,
    }),
  ])(state)
}

/** Action-creator for prependRevision. */
export const prependRevisionActionCreator =
  (payload: Parameters<typeof prependRevision>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'prependRevision', ...payload })

export default _.curryRight(prependRevision)
