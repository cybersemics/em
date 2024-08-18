import _ from 'lodash'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Thunk from '../@types/Thunk'
import { pullActionCreator as pull } from '../actions/pull'
import recentlyEdited from '../selectors/recentlyEdited'
import hashPath from '../util/hashPath'
import nonNull from '../util/nonNull'
import ThoughtLink from './ThoughtLink'

/** Pulls all paths in the jump history. */
const pullJumpHistory = (): Thunk => async (dispatch, getState) => {
  const state = getState()
  const paths = state.jumpHistory.filter(nonNull)
  // Pull all thoughts at once, rather than incrementally.
  // Otherwise thoughts can disappear as recentlyEdited is updated, which is visually disruptive.
  return dispatch(pull(paths.flat()))
}

/** Recently edited thoughts derived from the jump history. */
const RecentlyEdited = () => {
  const dispatch = useDispatch()

  const jumpHistory = useSelector(recentlyEdited, _.isEqual)

  // remove duplicates
  const paths = _.uniqBy(jumpHistory, hashPath)

  useEffect(() => {
    // TODO: Fix type
    dispatch(pullJumpHistory()) as unknown as Promise<void>
  }, [dispatch])

  return (
    <div style={{ marginBottom: '4em', marginTop: '1.5em' }}>
      {paths.length > 0 ? (
        <div>
          {paths.map(path => (
            <ThoughtLink key={hashPath(path)} path={path} />
          ))}
        </div>
      ) : (
        <div style={{ maxWidth: 450 }}>No recent thoughts.</div>
      )}
    </div>
  )
}

export default RecentlyEdited
