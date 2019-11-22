import React from 'react'

// components
import { Link } from './Link.js'
import { Superscript } from './Superscript.js'

// util
import {
  ancestors,
} from '../util.js'

/** Breadcrumbs for contexts within the context views. */
export const ContextBreadcrumbs = ({ itemsRanked, showContexts }) => {
  return <div className='breadcrumbs context-breadcrumbs'>
    {itemsRanked.map((itemRanked, i) => {
      const subitems = ancestors(itemsRanked, itemRanked)
      return <React.Fragment key={i}>
        <Link itemsRanked={subitems} />
        <Superscript itemsRanked={subitems} />
        {i < itemsRanked.length - 1 || showContexts ? <span className='breadcrumb-divider'> • </span> : null}
      </React.Fragment>
    })}
  </div>
}
