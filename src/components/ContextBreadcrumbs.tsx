import React from 'react'
import { connect } from 'react-redux'
import { simplifyPath } from '../selectors'
import { ancestors } from '../util'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

// components
import Link from './Link'
import Superscript from './Superscript'

interface ContextBreadcrumbProps {
  simplePath: SimplePath,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ContextBreadcrumbProps) => ({
  simplePath: simplifyPath(state, props.simplePath)
})

/** Breadcrumbs for contexts within the context views. */
const ContextBreadcrumbs = ({ simplePath }: ContextBreadcrumbProps & ReturnType<typeof mapStateToProps>) => {
  return <div className='breadcrumbs context-breadcrumbs'>
    {simplePath.map((thoughtRanked, i) => {
      const subthoughts = ancestors(simplePath, thoughtRanked) as SimplePath
      return <React.Fragment key={i}>
        <Link simplePath={subthoughts} />
        <Superscript simplePath={subthoughts} />
        {i < simplePath.length - 1 ? <span className='breadcrumb-divider'> • </span> : null}
      </React.Fragment>
    })}
  </div>
}

export default connect(mapStateToProps)(ContextBreadcrumbs)
