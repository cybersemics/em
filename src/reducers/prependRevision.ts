import { newThought } from '../reducers'
import { getThoughts } from '../selectors'
import { concatMany, concatOne, getPublishUrl, pathToContext, reducerFlow, unroot } from '../util'
import { State } from '../util/initialState'
import { Child, Path } from '../types'

/** Inserts a new revision from the given CID at the top of {path}/=publish/Revisions. */
const prependRevision = (state: State, { path, cid }: { path: Path, cid: string }) => {

  const context = pathToContext(path)

  /** Gets the =publish thought. */
  const publishChild = (state: State) => getThoughts(state, context)
    .find(child => child.value === '=publish')

  /** Gets the =publish/Revisions thought. */
  const revisionsChild = (state: State) => getThoughts(state, unroot(concatOne(context, '=publish')))
    .find(child => child.value === 'Revisions')

  return reducerFlow([

    // insert =publish if it does not exist
    // save the rank for revisions insertion
    state => !publishChild(state)
      ? newThought(state, { at: path, insertNewSubthought: true, insertBefore: true, value: '=publish', preventSetCursor: true })
      : state,

    // insert Revisions if it does not exist
    // save the rank for url insertion
    state => !revisionsChild(state)
      ? newThought(state, { at: concatOne(path, publishChild(state) as Child), insertNewSubthought: true, insertBefore: true, value: 'Revisions', preventSetCursor: true })
      : state,

    // insert revision url
    state => newThought(state, { at: concatMany(path, [publishChild(state) as Child, revisionsChild(state) as Child]), insertNewSubthought: true, insertBefore: true, value: getPublishUrl(cid), preventSetCursor: true }),

  ])(state)
}

export default prependRevision
