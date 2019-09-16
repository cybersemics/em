import React from 'react'
import { connect } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { isMobile } from '../browser.js'

// components
import { Link } from './Link.js'
import { Superscript } from './Superscript.js'

// util
import {
  ancestors,
} from '../util.js'

/** Main navigation breadcrumbs */
export const Breadcrumbs = connect(({ cursor }) => ({ cursor }))(({ cursor }) => {

  const itemsRanked = cursor ? cursor.slice(0, cursor.length - 1) : []

  return <div className='breadcrumbs nav-breadcrumbs'>
    <TransitionGroup>
      {itemsRanked.map((itemRanked, i) => {
        const subitems = ancestors(itemsRanked, itemRanked)
        return <CSSTransition key={i} timeout={200} classNames='fade'>
          {/* Cannot use React.Fragment with CSSTransition, as it applies the class to the first child */}
          <span>
            {!isMobile || i > 0 ? <span className='breadcrumb-divider'> • </span> : null}
            <Link itemsRanked={subitems} />
            <Superscript itemsRanked={subitems} />
          </span>
        </CSSTransition>
      })}
    </TransitionGroup>
  </div>
})

