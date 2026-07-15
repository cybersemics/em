import { FC } from 'react'
import SimplePath from '../@types/SimplePath'
import isRoot from '../util/isRoot'
import Link from './Link'

interface MoveThoughtAlertProps {
  from: string
  inContext?: string
  to: string
  toPath: SimplePath
  top?: boolean
}

/** Alert shown after drag-and-drop moves a thought to another context. */
const MoveThoughtAlert: FC<MoveThoughtAlertProps> = ({ from, inContext = '', to, toPath, top }) => (
  <span>
    {from} moved to{top ? ' top of' : ''}{' '}
    {isRoot(toPath) ? (
      to
    ) : (
      <>
        &quot;
        <Link simplePath={toPath} label={to} style={{ cursor: 'pointer', textDecoration: 'underline' }} />
        &quot;
      </>
    )}
    {inContext}.
  </span>
)

export default MoveThoughtAlert
