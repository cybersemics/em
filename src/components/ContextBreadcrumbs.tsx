import React from 'react'
import { ancestors } from '../util'
import { Path } from '../types'

// components
import Link from './Link'
import Superscript from './Superscript'

/** Breadcrumbs for contexts within the context views. */
const ContextBreadcrumbs = ({ thoughtsRanked, showContexts }: { thoughtsRanked: Path, showContexts?: boolean }) => {
  return <div className='breadcrumbs context-breadcrumbs' style={{
    visibility: showContexts ? 'visible' : 'hidden'
  }}>
    {thoughtsRanked.map((thoughtRanked, i) => {
      const subthoughts = ancestors(thoughtsRanked, thoughtRanked)
      return <React.Fragment key={i}>
        <Link thoughtsRanked={subthoughts} />
        <Superscript thoughtsRanked={subthoughts} />
        {i < thoughtsRanked.length - 1 || showContexts ? <span className='breadcrumb-divider'> • </span> : null}
      </React.Fragment>
    })}
  </div>
}

export default ContextBreadcrumbs
