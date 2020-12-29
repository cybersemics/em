import React, { Fragment } from 'react'
import { store } from '../../store'
import { isTouch } from '../../browser'
import { getChildrenRanked } from '../../selectors'
import { ellipsize, pathToContext } from '../../util'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpandExpand = ({ cursor, rootSubthoughts = [] }) => {

  /** A thought in the root that is not the cursor and has children. */
  const rootSubthoughtNotCursorWithSubthoughts = () =>
    rootSubthoughts.find(child =>
      (!cursor || pathToContext(cursor).indexOf(child.value) === -1) &&
      getChildrenRanked(store.getState(), [child]).length > 0
    )

  /** Gets a child of a thought in the root that is not the cursor. */
  const rootGrandchildNotCursor = () => {
    const uncle = rootSubthoughtNotCursorWithSubthoughts()
    return uncle ? getChildrenRanked(store.getState(), [uncle])[0] : null
  }
  return <Fragment>
    {rootGrandchildNotCursor() ? <p>Notice that "{ellipsize(rootGrandchildNotCursor().value)}" is hidden now.</p> : ''}
    <p>Well done. There are no files to open or close in <b>em</b>. All your thoughts are connected in one big thoughtspace, but kept tidy through autofocus.</p>
    <p>{isTouch ? 'Tap' : 'Click'} {rootSubthoughtNotCursorWithSubthoughts() ? `"${ellipsize(rootSubthoughtNotCursorWithSubthoughts().value)}"` : 'a thought'} to reveal its subthought{rootGrandchildNotCursor() ? ` "${ellipsize(rootGrandchildNotCursor().value)}"` : null}.</p>
  </Fragment>
}

export default TutorialStepAutoExpandExpand
