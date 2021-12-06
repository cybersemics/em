import _ from 'lodash'
import { newThought } from '../reducers'
import { appendToPath, concatOne, getPublishUrl, pathToContext, reducerFlow, unroot } from '../util'
import { Path, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Inserts a new revision from the given CID at the top of {path}/=publish/Revisions. */
const prependRevision = (state: State, { path, cid }: { path: Path; cid: string }) => {
  const context = pathToContext(state, path)

  /** Gets the =publish thought. */
  const publishChild = (state: State) =>
    getAllChildrenAsThoughts(state, context).find(child => child.value === '=publish')

  /** Gets the =publish/Revisions thought. */
  const revisionsChild = (state: State) =>
    getAllChildrenAsThoughts(state, unroot(concatOne(context, '=publish'))).find(child => child.value === 'Revisions')

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

export default _.curryRight(prependRevision)
