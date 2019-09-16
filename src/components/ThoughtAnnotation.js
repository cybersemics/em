import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// components
import { HomeLink } from './HomeLink.js'
import { StaticSuperscript } from './StaticSuperscript.js'

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
})(({ itemsRanked, showContexts, contextChain, homeContext, isEditing, focusOffset }) => {

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // get all subthoughts and the subthought under the selection
  const key = sigKey(showContexts ? intersections(itemsRanked) : itemsRanked)
  const subthoughts = /*getSubthoughts(key, 3)*/key ? [{
    text: key,
    contexts: getContexts(key)
  }] : []
  // const subthoughtUnderSelection = perma(() => findSubthoughtByIndex(subthoughts, focusOffset))

  return <div className='thought-annotation' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>
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
          {subthought.contexts.length > (subthought.text === key ? 1 : 0)
            ? <StaticSuperscript n={subthought.contexts.length} />
            : null
          }
        </React.Fragment>
      })
    }
  </div>
})

