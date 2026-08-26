import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import newThought from '../actions/newThought'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild } from '../selectors/getChildren'
import parentContextPath from '../selectors/parentContextPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import getPublishUrl from '../util/getPublishUrl'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Inserts a new revision from the given CID at the top of {path}/=publish/Revisions. */
const prependRevision = (state: State, { path, cid }: { path: Path; cid: string }) => {
  // =publish is a metaprogramming attribute of the thought the user sees, which in the context view is the context
  // rather than the Lexeme context. Resolving the path once keeps the lookups and the thoughts that are created below
  // in the same context.
  const contextPath = parentContextPath(state, path)

  /** Gets the =publish thought. */
  const publishChild = (state: State) => findAnyChild(state, head(contextPath), child => child.value === '=publish')

  /** Gets the =publish/Revisions thought. */
  const revisionsChild = (state: State): Thought | null => {
    const publishId = findDescendant(state, head(contextPath), '=publish')
    if (!publishId) return null
    return findAnyChild(state, publishId, child => child.value === 'Revisions') || null
  }

  return reducerFlow([
    // insert =publish if it does not exist
    // save the rank for revisions insertion
    state =>
      !publishChild(state)
        ? newThought(state, {
            at: contextPath,
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
            at: appendToPath(contextPath, publishChild(state)!.id),
            insertNewSubthought: true,
            insertBefore: true,
            value: 'Revisions',
            preventSetCursor: true,
          })
        : state,

    // insert revision url
    newThought({
      at: appendToPath(contextPath, publishChild(state)!.id, revisionsChild(state)!.id),
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

// Register this action's metadata
registerActionMetadata('prependRevision', {
  undoable: false,
})
