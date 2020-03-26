
import React, { Fragment } from 'react'
import { isMobile } from '../../browser'
import {
  ellipsize,
  getThoughtsRanked,
  pathToContext,
} from '../../util'

const TutorialStepAutoExpandExpand = ({ cursor, rootSubthoughts = [] }) => {

  // a thought in the root that is not the cursor and has children
  const rootSubthoughtNotCursorWithSubthoughts = () =>
    rootSubthoughts.find(child =>
      (!cursor || pathToContext(cursor).indexOf(child.value) === -1) &&
      getThoughtsRanked([child]).length > 0
    )

  // a child of a thought in the root that is not the cursor
  const rootGrandchildNotCursor = () => {
    const uncle = rootSubthoughtNotCursorWithSubthoughts()
    return uncle ? getThoughtsRanked([uncle])[0] : null
  }
  return (<Fragment>
    {rootGrandchildNotCursor() ? <p>Notice that "{ellipsize(rootGrandchildNotCursor().value)}" is hidden now.</p> : ''}
    <p>There are no files to open or close in <b>em</b>. All of your thoughts are in one place. You can stay focused because only a few thoughts are visible at a time.</p>
    <p>{isMobile ? 'Tap' : 'Click'} {rootSubthoughtNotCursorWithSubthoughts() ? `"${ellipsize(rootSubthoughtNotCursorWithSubthoughts().value)}"` : 'a thought'} to reveal its subthought{rootGrandchildNotCursor() ? ` "${ellipsize(rootGrandchildNotCursor().value)}"` : null}.</p>
  </Fragment>)
}

export default TutorialStepAutoExpandExpand
