import newThought from '../action-creators/newThought'

import {
  getPublishUrl,
  pathToContext,
  unroot,
} from '../util'

// selectors
import getThoughts from '../selectors/getThoughts'

/** Inserts a new revision from the given CID at the top of {at}/=publish/Revisions */
const prependRevision = (at, cid) => (dispatch, getState) => {
  const state = getState()
  const publishChild = getThoughts(state, pathToContext(at))
    .find(child => child.value === '=publish')
  const revisionsChild = getThoughts(state, unroot(pathToContext(at).concat('=publish')))
    .find(child => child.value === 'Revisions')

  // insert =publish if it does not exist
  // save the rank for revisions insertion
  const { rank: publishRank } = publishChild ||
    dispatch(newThought({ at, insertNewSubthought: true, insertBefore: true, value: '=publish', preventSetCursor: true }))
  const pathPublish = at.concat(publishChild || { value: '=publish', rank: publishRank })

  // insert Revisions if it does not exist
  // save the rank for url insertion
  const { rank: revisionsRank } = revisionsChild ||
    dispatch(newThought({ at: pathPublish, insertNewSubthought: true, insertBefore: true, value: 'Revisions', preventSetCursor: true }))
  const pathRevisions = pathPublish.concat(revisionsChild || { value: 'Revisions', rank: revisionsRank })

  // insert revision url
  dispatch(newThought({ at: pathRevisions, insertNewSubthought: true, insertBefore: true, value: getPublishUrl(cid), preventSetCursor: true }))
}

export default prependRevision
