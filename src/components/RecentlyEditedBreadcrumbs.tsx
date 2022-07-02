import React from 'react'
import { connect, useSelector } from 'react-redux'
import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import { ContextBreadcrumbProps, ContextBreadcrumbs } from './ContextBreadcrumbs'
// components
import Link from './Link'
import Superscript from './Superscript'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: Omit<ContextBreadcrumbProps, 'simplePath'> & { path: Path }) => ({
  simplePath: simplifyPath(state, props.path),
})

/**
 * Varaint of ContextBreadcrumbs for recently edited with collapsing overflow.
 */
const RecentlyEditedBreadcrumbs = connect(mapStateToProps)(
  (props: ContextBreadcrumbProps & ReturnType<typeof mapStateToProps>) => {
    const parentSimplePath = parentOf(props.simplePath)
    const simplePath = props.simplePath

    const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

    return (
      <div className='recently-edited-breadcrumbs'>
        <ContextBreadcrumbs {...props} simplePath={parentSimplePath} />
        <Link simplePath={simplePath} label={value} />
        <Superscript simplePath={simplePath} />
      </div>
    )
  },
)

export default RecentlyEditedBreadcrumbs
