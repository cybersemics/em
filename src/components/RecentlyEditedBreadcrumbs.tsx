import React from 'react'
import { connect, useSelector } from 'react-redux'
import { getThoughtById, simplifyPath } from '../selectors'

// components
import Link from './Link'
import Superscript from './Superscript'
import { ContextBreadcrumbs, ContextBreadcrumbProps } from './ContextBreadcrumbs'
import { head, parentOf } from '../util'
import { Path, State } from '../@types'

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
