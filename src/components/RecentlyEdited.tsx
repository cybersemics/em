import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Thunk from '../@types/Thunk'
import { pullActionCreator as pull } from '../actions/pull'
import recentlyEdited from '../selectors/recentlyEdited'
import hashPath from '../util/hashPath'
import nonNull from '../util/nonNull'
import LoadingEllipsis from './LoadingEllipsis'
import ThoughtLink from './ThoughtLink'

/** Pulls all paths in the jump history. */
const pullJumpHistory = (): Thunk => async (dispatch, getState) => {
  const state = getState()
  const paths = state.jumpHistory.filter(nonNull)
  return dispatch(pull(paths.flat()))
}

/** A hook that flips its state after thn given amount of time. */
const useDelayedState = (time: number) => {
  const [done, setDone] = useState(false)
  const timer = setTimeout(() => setDone(true), time)
  const cancel = useCallback(() => clearTimeout(timer), [timer])
  const flush = useCallback(() => {
    clearTimeout(timer)
    setDone(true)
  }, [setDone, timer])
  return [done, flush, cancel] as const
}

/** Recently edited thoughts derived from the jump history. */
const RecentlyEdited = () => {
  const dispatch = useDispatch()

  // Only render when all the thoughts in the jump history have been pulled.
  // Otherwise thoughts can disappear as recentlyEdited is updated, which is visually disruptive.
  const [loaded, setLoaded] = useState(false)

  // It is better to only show the loading ellipsis after a beat has passed rather than quickly flash it.
  const [ready, flushReady] = useDelayedState(600)

  const jumpHistory = useSelector(recentlyEdited, _.isEqual)

  // remove duplicates
  const paths = _.uniqBy(jumpHistory, hashPath)

  useEffect(() => {
    // TODO: Fix type
    const p = dispatch(pullJumpHistory()) as unknown as Promise<void>
    p.then(() => {
      setLoaded(true)
      flushReady()
    })
  }, [flushReady, dispatch])

  return (
    <div style={{ marginBottom: '4em', marginTop: '1.5em' }}>
      {!loaded ? (
        ready ? (
          <LoadingEllipsis />
        ) : null
      ) : paths.length > 0 ? (
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
