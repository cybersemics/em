import React from 'react'
import { useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import parentOf from '../util/parentOf'
import { ContextBreadcrumbs } from './ContextBreadcrumbs'
import Link from './Link'
import Superscript from './Superscript'

/** Variant of ContextBreadcrumbs for recently edited with collapsing overflow. */
const RecentlyEditedBreadcrumbs = ({
  charLimit,
  simplePath,
  styleLink,
  thoughtsLimit,
}: {
  charLimit: number
  simplePath: SimplePath
  styleLink?: React.CSSProperties
  thoughtsLimit: number
}) => {
  const parentSimplePath = parentOf(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <div className='recently-edited-breadcrumbs'>
      <ContextBreadcrumbs simplePath={parentSimplePath} charLimit={charLimit} thoughtsLimit={thoughtsLimit} />
      <Link simplePath={simplePath} label={value} style={styleLink} />
      <Superscript simplePath={simplePath} />
    </div>
  )
}

export default RecentlyEditedBreadcrumbs
