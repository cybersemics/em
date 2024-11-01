import { isEqual, sortBy } from 'lodash'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Thunk from '../@types/Thunk'
import { pullActionCreator as pull } from '../actions/pull'
import { pullAncestorsActionCreator as pullAncestors } from '../actions/pullAncestors'
import { getLexemeById } from '../data-providers/yjs/thoughtspace'
import useDelayedState from '../hooks/useDelayedState'
import getChildPath from '../selectors/getChildPath'
import { getAllChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import pathToThought from '../selectors/pathToThought'
import thoughtToPath from '../selectors/thoughtToPath'
import hashPath from '../util/hashPath'
import hashThought from '../util/hashThought'
import head from '../util/head'
import LoadingEllipsis from './LoadingEllipsis'
import ThoughtLink from './ThoughtLink'

/** An action-creator that pulls all deleted thoughts, i.e. children of contexts of =archive. */
const pullDeleted = (): Thunk<Promise<void>> => async (dispatch, getState) => {
  // pull the =archive lexeme
  const lexeme = await getLexemeById(hashThought('=archive'))
  // pull all ancestors of all contexts of =archive
  await dispatch(pullAncestors(lexeme?.contexts ?? [], { force: true, maxDepth: 0 }))
  const state = getState()
  const archivePaths = lexeme?.contexts.map(cxid => thoughtToPath(state, cxid)) ?? []
  const children = archivePaths.flatMap(path => getAllChildren(state, head(path)))
  // pull all children of all =archive instances, as they are the deleted thoughts
  await dispatch(pull(children))
}

/** Recently Deleted thoughts derived from the jump history. */
const RecentlyDeleted = () => {
  const dispatch = useDispatch()

  // Only render when all the thoughts in the jump history have been pulled.
  // Otherwise thoughts can disappear as recentlyDeleted is updated, which is visually disruptive.
  const [loaded, setLoaded] = useState(false)

  // It is better to only show the loading ellipsis after a beat has passed rather than quickly flash it.
  const [ready, flushReady] = useDelayedState(600)

  // list of paths of all deleted thoughts
  const paths = useSelector(state => {
    if (!loaded) return []

    const lexeme = getLexeme(state, '=archive')
    // paths of all =archive instances
    const archivePaths = lexeme?.contexts.map(cxid => thoughtToPath(state, cxid)) ?? []
    // paths of all the children of =archive, since those are the deleted thoughts
    const childrenPaths = archivePaths.flatMap(path =>
      getAllChildren(state, head(path)).map(child => getChildPath(state, child, path)),
    )
    // sort by archived timestamp descending
    const childrenPathsSorted = sortBy(childrenPaths, path => -(pathToThought(state, path)?.archived || 0))

    return childrenPathsSorted
  }, isEqual)

  useEffect(() => {
    // prettier adds a semicolon and eslint tries to remove it

    ;(async () => {
      await dispatch(pullDeleted())
      setLoaded(true)
      flushReady()
    })()
  }, [dispatch, flushReady])

  return (
    <div className={css({ marginBottom: '4em', marginTop: '1.5em' })}>
      {!loaded ? (
        ready ? (
          <LoadingEllipsis />
        ) : null
      ) : paths.length > 0 ? (
        <div>
          {paths.map(path => (
            <ThoughtLink key={hashPath(path)} path={path} hideArchive />
          ))}
        </div>
      ) : (
        <div className={css({ maxWidth: 450 })}>No deleted thoughts.</div>
      )}
    </div>
  )
}

export default RecentlyDeleted
