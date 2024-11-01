import { isEqual, uniqBy } from 'lodash'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Thunk from '../@types/Thunk'
import { pullAncestorsActionCreator as pullAncestors } from '../actions/pullAncestors'
import useDelayedState from '../hooks/useDelayedState'
import recentlyEdited from '../selectors/recentlyEdited'
import hashPath from '../util/hashPath'
import nonNull from '../util/nonNull'
import LoadingEllipsis from './LoadingEllipsis'
import ThoughtLink from './ThoughtLink'

/** Pulls all paths in the jump history. */
const pullJumpHistory = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  const state = getState()
  const paths = state.jumpHistory.filter(nonNull)
  await Promise.all(
    paths.map(async path => {
      try {
        await dispatch(pullAncestors(path, { force: true, maxDepth: 0 }))
      } catch (e) {
        // TODO: Missing docKey error
        console.warn(e)
      }
    }),
  )
}

/** Recently edited thoughts derived from the jump history. */
const RecentlyEdited = () => {
  const dispatch = useDispatch()

  // Only render when all the thoughts in the jump history have been pulled.
  // Otherwise thoughts can disappear as recentlyEdited is updated, which is visually disruptive.
  const [loaded, setLoaded] = useState(false)

  // It is better to only show the loading ellipsis after a beat has passed rather than quickly flash it.
  const [ready, flushReady] = useDelayedState(600)

  const jumpHistory = useSelector(recentlyEdited, isEqual)

  // remove duplicates
  const paths = uniqBy(jumpHistory, hashPath)

  useEffect(() => {
    // prettier adds a semicolon and eslint tries to remove it

    ;(async () => {
      await dispatch(pullJumpHistory())
      setLoaded(true)
      flushReady()
    })()
  }, [
    flushReady,
    dispatch,
    // Due to thn missing docKey error, the entire jump history may not be pulled in one go.
    // Re-triggering pullJumpHistory when the jump history changes should ensure that all thoughts are pulled.
    jumpHistory,
  ])

  return (
    <div className={css({ marginBottom: '4em', marginTop: '1.5em' })}>
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
        <div className={css({ maxWidth: 450 })}>No recent thoughts.</div>
      )}
    </div>
  )
}

export default RecentlyEdited
