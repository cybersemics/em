import { FC } from 'react'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import getThoughtById from '../selectors/getThoughtById'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import headValue from '../util/headValue'
import isRoot from '../util/isRoot'
import Link from './Link'

interface MoveThoughtAlertProps {
  /** Value of the first moved thought. */
  from: string
  /** Total number of moved thoughts. Defaults to one. */
  numThoughts?: number
  /** Destination context path. Root destinations render as home; other destinations render as a clickable thought link. */
  toPath: SimplePath
  /** True when the thought was moved to the top of the destination context. */
  top?: boolean
  /** Context whose occurrence received the thought when dropping in context view. */
  contextPath?: Path
}

/** Alert shown after drag-and-drop moves a thought to another context. */
const MoveThoughtAlert: FC<MoveThoughtAlertProps> = ({ contextPath, from, numThoughts = 1, toPath, top }) => {
  const isRootPath = isRoot(toPath)
  const to = useSelector(state => (isRootPath ? 'home' : getThoughtById(state, head(toPath))?.value || ''))
  const context = useSelector(state => (contextPath ? headValue(state, contextPath) : null))
  const alertFrom = numThoughts === 1 ? `"${ellipsize(from)}"` : `${numThoughts} thoughts`

  return (
    <span>
      {alertFrom} moved to{top ? ' top of' : ''}{' '}
      {isRootPath ? (
        to
      ) : (
        <>
          &quot;
          <Link simplePath={toPath} label={ellipsize(to)} style={{ cursor: 'pointer', textDecoration: 'underline' }} />
          &quot;
        </>
      )}
      {contextPath ? ` in the context of ${ellipsize(context || 'MISSING_CONTEXT')}` : ''}.
    </span>
  )
}

export default MoveThoughtAlert
