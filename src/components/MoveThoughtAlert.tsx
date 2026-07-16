import { FC } from 'react'
import { useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import isRoot from '../util/isRoot'
import Link from './Link'

interface MoveThoughtAlertProps {
  /** Display label for the moved thought or thoughts, e.g. `"a"` or `2 thoughts`. */
  from: string
  /** Destination context path. Root destinations render as home; other destinations render as a clickable thought link. */
  toPath: SimplePath
  /** True when the thought was moved to the top of the destination context. */
  top?: boolean
}

/** Alert shown after drag-and-drop moves a thought to another context. */
const MoveThoughtAlert: FC<MoveThoughtAlertProps> = ({ from, toPath, top }) => {
  const isRootPath = isRoot(toPath)
  const to = useSelector(state => (isRootPath ? 'home' : getThoughtById(state, head(toPath))?.value || ''))

  return (
    <span>
      {from} moved to{top ? ' top of' : ''}{' '}
      {isRootPath ? (
        to
      ) : (
        <>
          &quot;
          <Link
            charLimit={16}
            simplePath={toPath}
            label={to}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          />
          &quot;
        </>
      )}
      .
    </span>
  )
}

export default MoveThoughtAlert
