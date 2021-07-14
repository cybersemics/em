import React from 'react'
import { isTouch } from '../../browser'
import { getAllChildren, getChildrenRanked } from '../../selectors'
import { store } from '../../store'
import { ellipsize } from '../../util'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpandExpand = ({ cursor, rootChildren = [] }) => {
  const uncle = thoughtsNoCursorWithChild(cursor, rootChildren)[0]

  /** Gets the first child of the first thought in the root that is not the cursor. */
  const childWithNoCursorParent = uncle ? getChildrenRanked(store.getState(), [uncle.value])[0] : null

  const hiddenChild = ellipsize(childWithNoCursorParent?.value) || ''

  return (
    <>
      {childWithNoCursorParent ? <p>Notice that "{hiddenChild}" is hidden now.</p> : ''}
      <p>
        Well done. There are no files to open or close in <b>em</b>. All your thoughts are connected in one big
        thoughtspace, but kept tidy through autofocus.
      </p>
      <p>
        {isTouch ? 'Tap' : 'Click'} {uncle ? `"${ellipsize(uncle.value)}"` : 'a thought'} to reveal its subthought "
        {hiddenChild}".
      </p>
    </>
  )
}

/**
 * @param cursor The array that display the thought string which has a cursor.
 * @param rootChildren The object array that show all the root thoughts.
 * @returns The array that holds all the thoughts that that don't have a cursor, but have children.
 */
const thoughtsNoCursorWithChild = (cursor, rootChildren) => {
  const noCursorThoughts = cursor ? rootChildren.filter(c => c.value !== cursor[0].value) : rootChildren
  return noCursorThoughts.filter(t => getAllChildren(store.getState(), [t.value]).length > 0)
}

export default TutorialStepAutoExpandExpand
