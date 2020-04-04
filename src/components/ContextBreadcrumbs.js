import React from 'react'

// components
import Link from './Link.js'
import Superscript from './Superscript'

// util
import {
  ancestors,
} from '../util'

/** Breadcrumbs for contexts within the context views. */
const ContextBreadcrumbs = ({ thoughtsRanked, showContexts }) => {
  return <div className='breadcrumbs context-breadcrumbs'>
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
