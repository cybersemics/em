import React from 'react'
import { connect } from 'react-redux'
import { simplifyPath } from '../selectors'
import { State } from '../util/initialState'

// components
import Link from './Link'
import Superscript from './Superscript'
import { ContextBreadcrumbs, ContextBreadcrumbProps } from './ContextBreadcrumbs'
import { headValue, parentOf } from '../util'
import { Path } from '../types'

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

    return (
      <div className='recently-edited-breadcrumbs'>
        <ContextBreadcrumbs {...props} simplePath={parentSimplePath} />
        <Link simplePath={simplePath} label={headValue(simplePath)} />
        <Superscript simplePath={simplePath} />
      </div>
    )
  },
)

export default RecentlyEditedBreadcrumbs
