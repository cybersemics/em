import _ from 'lodash'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import pathToThought from '../selectors/pathToThought'
import hashPath from '../util/hashPath'
import ThoughtLink from './ThoughtLink'

/** Recently visited thoughts. */
const RecentlyEdited = () => {
  const jumpHistory = useSelector(
    state => state.jumpHistory.filter(path => path && pathToThought(state, path)) as Path[],
    _.isEqual,
  )

  // remove duplicates
  const paths = _.uniqBy(jumpHistory, hashPath)

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
