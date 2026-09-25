import { isEqual, sortBy } from 'lodash'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import getChildPath from '../selectors/getChildPath'
import { getAllChildren } from '../selectors/getChildren'
import getLexeme from '../selectors/getLexeme'
import pathToThought from '../selectors/pathToThought'
import thoughtToPath from '../selectors/thoughtToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import ThoughtLink from './ThoughtLink'

/** Recently deleted thoughts derived from archive contexts in the complete document. */
const RecentlyDeleted = () => {
  // list of paths of all deleted thoughts
  const paths = useSelector(state => {
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

  return (
    <div className={css({ marginBottom: '4em', marginTop: '1.5em' })}>
      {paths.length > 0 ? (
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
