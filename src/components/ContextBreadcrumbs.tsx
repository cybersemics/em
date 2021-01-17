import React from 'react'
import { connect } from 'react-redux'
import { simplifyPath } from '../selectors'
import { ancestors, isRoot } from '../util'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

// components
import HomeLink from './HomeLink'
import Link from './Link'
import Superscript from './Superscript'

interface ContextBreadcrumbProps {
  homeContext?: boolean,
  simplePath: SimplePath,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ContextBreadcrumbProps) => ({
  simplePath: simplifyPath(state, props.simplePath)
})

/** Breadcrumbs for contexts within the context views. */
const ContextBreadcrumbs = ({ homeContext, simplePath }: ContextBreadcrumbProps & ReturnType<typeof mapStateToProps>) => {
  return <div className='breadcrumbs context-breadcrumbs'>
    {isRoot(simplePath)
    /*
      If the path is the root context, check homeContext which is true if the context is directly in the root (in which case the HomeLink is already displayed as the thought)

      For example:

        - a
        - b
          - a
        - c
          - d
            - a

      Activating the context view on "a" will show three contexts: ROOT, b, and c/d.

      - The ROOT context will render the HomeLink as a thought. No breadcrumbs are displayed.
      - The "b" context will render "b" as a thought and the HomeLink as the breadcrumbs.
      - The "c/d" context will render "d" as a thought and "c" as the breadcrumbs.
    */
      ? !homeContext ? <HomeLink color='gray' size={16} style={{ position: 'relative', left: -5, top: 2 }} /> : null
      : simplePath.map((thoughtRanked, i) => {
        const subthoughts = ancestors(simplePath, thoughtRanked) as SimplePath
        return <React.Fragment key={i}>
          <Link simplePath={subthoughts} />
          <Superscript simplePath={subthoughts} />
          {i < simplePath.length - 1 ? <span className='breadcrumb-divider'> • </span> : null}
        </React.Fragment>
      })
    }
  </div>
}

export default connect(mapStateToProps)(ContextBreadcrumbs)
