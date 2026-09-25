import { isEqual, uniqBy } from 'lodash'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import recentlyEdited from '../selectors/recentlyEdited'
import hashPath from '../util/hashPath'
import ThoughtLink from './ThoughtLink'

/** Recently edited thoughts derived from the jump history. */
const RecentlyEdited = () => {
  const jumpHistory = useSelector(recentlyEdited, isEqual)

  // remove duplicates
  const paths = uniqBy(jumpHistory, hashPath)

  return (
    <div className={css({ marginBottom: '4em', marginTop: '1.5em' })}>
      {paths.length > 0 ? (
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
