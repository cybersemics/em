import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import { ContextBreadcrumbProps, ContextBreadcrumbs } from './ContextBreadcrumbs'
import Link from './Link'
import Superscript from './Superscript'

/** Variant of ContextBreadcrumbs for recently edited with collapsing overflow. */
const RecentlyEditedBreadcrumbs = (props: Omit<ContextBreadcrumbProps, 'simplePath'> & { path: Path }) => {
  const simplePath = useSelector((state: State) => simplifyPath(state, props.path), shallowEqual)
  const parentSimplePath = parentOf(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <div className='recently-edited-breadcrumbs'>
      <ContextBreadcrumbs {...props} simplePath={parentSimplePath} />
      <Link simplePath={simplePath} label={value} style={props.styleLink} />
      <Superscript simplePath={simplePath} />
    </div>
  )
}

export default RecentlyEditedBreadcrumbs
