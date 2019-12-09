import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// components
import { HomeLink } from './HomeLink.js'
import { StaticSuperscript } from './StaticSuperscript.js'
import { ContextBreadcrumbs } from './ContextBreadcrumbs.js'

// util
import {
  chain,
  equalItemsRanked,
  getContexts,
  intersections,
  sigKey,
  signifier,
  unroot,
} from '../util.js'

/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
export const ThoughtAnnotation = connect(({ cursor, cursorBeforeEdit, focusOffset }, props) => {

  // reerender annotation in realtime when thought is edited
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)
  const itemsRankedLive = isEditing
    ? intersections(props.itemsRanked).concat(signifier(props.showContexts ? intersections(cursor) : cursor))
    : props.itemsRanked

  return {
    itemsRanked: itemsRankedLive,
    isEditing,
    focusOffset
  }
})(({ itemsRanked, showContexts, showContextBreadcrumbs, contextChain, homeContext, isEditing, focusOffset, minContexts = 2, isLinkParent, childLink }) => {

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // get all subthoughts and the subthought under the selection
  const key = sigKey(showContexts ? intersections(itemsRanked) : itemsRanked)
  const subthoughts = /* getSubthoughts(key, 3) */key ? [{
    text: key,
    contexts: getContexts(key)
  }] : []
  // const subthoughtUnderSelection = perma(() => findSubthoughtByIndex(subthoughts, focusOffset))

  return <div className='thought-annotation' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

    {showContextBreadcrumbs ? <ContextBreadcrumbs itemsRanked={intersections(intersections(itemsRanked))} showContexts={showContexts} /> : null}

    {homeContext
      ? <HomeLink/>
      : subthoughts.map((subthought, i) => {

        return <React.Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className={classNames({
            subthought: true,
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === key ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          })}>
            <span className='subthought-text'>{subthought.text}</span>
          </span>
          { // with the default minContexts of 2, do not count the whole thought
            minContexts === 0 || subthought.contexts.length > (subthought.text === key ? 1 : 0)
            ? <StaticSuperscript n={subthought.contexts.length} />
            : null
          }
          {isLinkParent
            // eslint-disable-next-line no-undef
            ? <a href={childLink} rel="noopener noreferrer" target="_blank">
                <svg style={{ marginLeft: '2px', cursor: 'pointer', pointerEvents: 'all' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
              </a>
            : null
          }
        </React.Fragment>
      })
    }
  </div>
})
