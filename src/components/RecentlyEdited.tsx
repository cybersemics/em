import _ from 'lodash'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../@types/Path'
import Thunk from '../@types/Thunk'
import { pullActionCreator as pull } from '../actions/pull'
import pathToThought from '../selectors/pathToThought'
import hashPath from '../util/hashPath'
import ThoughtLink from './ThoughtLink'

/** Pulls all paths in the jump history. */
const pullJumpHistory = (): Thunk => async (dispatch, getState) => {
  const state = getState()
  for (const path of state.jumpHistory) {
    if (!path) continue
    for (const id of path) {
      await dispatch(pull([id], { force: true, maxDepth: 0 }))
    }
  }
}

/** Recently edited thoughts. */
const RecentlyEdited = () => {
  const dispatch = useDispatch()

  const jumpHistory = useSelector(
    state => state.jumpHistory.filter(path => path && pathToThought(state, path)) as Path[],
    _.isEqual,
  )

  // remove duplicates
  const paths = _.uniqBy(jumpHistory, hashPath)

  useEffect(() => {
    dispatch(pullJumpHistory())
  }, [dispatch])

  return (
    <div style={{ marginTop: '1.5em' }}>
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
