import React from 'react'

// components
import { Link } from './Link.js'
import { Superscript } from './Superscript.js'

// util
import {
  ancestors,
} from '../util.js'

/** Breadcrumbs for contexts within the context views. */
export const ContextBreadcrumbs = ({ thoughtsRanked, showContexts }) => {
  return <div className='breadcrumbs context-breadcrumbs'>
    {thoughtsRanked.map((thoughtRanked, i) => {
      const subitems = ancestors(thoughtsRanked, thoughtRanked)
      return <React.Fragment key={i}>
        <Link thoughtsRanked={subitems} />
        <Superscript thoughtsRanked={subitems} />
        {i < thoughtsRanked.length - 1 || showContexts ? <span className='breadcrumb-divider'> • </span> : null}
      </React.Fragment>
    })}
  </div>
}
