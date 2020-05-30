import {
  concatMany,
  concatOne,
  getPublishUrl,
  pathToContext,
  reducerFlow,
  unroot,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

// reducers
import newThought from './newThought'

/** Inserts a new revision from the given CID at the top of {path}/=publish/Revisions. */
const prependRevision = (state, { path, cid }) => {

  const context = pathToContext(path)

  /** Gets the =publish thought. */
  const publishChild = state => getThoughts(state, context)
    .find(child => child.value === '=publish')

  /** Gets the =publish/Revisions thought. */
  const revisionsChild = state => getThoughts(state, unroot(concatOne(context, '=publish')))
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
      ? newThought(state, { at: concatOne(path, publishChild(state)), insertNewSubthought: true, insertBefore: true, value: 'Revisions', preventSetCursor: true })
      : state,

    // insert revision url
    state => newThought(state, { at: concatMany(path, [publishChild(state), revisionsChild(state)]), insertNewSubthought: true, insertBefore: true, value: getPublishUrl(cid), preventSetCursor: true }),

  ])(state)
}

export default prependRevision
