import React, { Fragment } from 'react'
import { store } from '../../store'
import { isTouch } from '../../browser'

// constants
import { HOME_TOKEN } from '../../constants'

// util
import {
  parentOf,
  ellipsize,
  head,
  headValue,
  pathToContext,
} from '../../util'

// selectors
import {
  getAllChildren,
} from '../../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpand = ({ cursor, rootSubthoughts = [] } = {}) => {

  const state = store.getState()
  const cursorContext = pathToContext(cursor || [])
  const cursorChildren = getAllChildren(state, cursorContext)
  const isCursorLeaf = cursorChildren.length === 0
  const ancestorThought = isCursorLeaf ? parentOf(parentOf(cursorContext)) : parentOf(cursorContext)

  const ancestorThoughtChildren = getAllChildren(state, ancestorThought.length === 0 ? [HOME_TOKEN] : ancestorThought)
  const isCursorRootChildren = (cursor || []).length === 1

  const isCursorCollapsePossible = ancestorThoughtChildren.length > 1 && !(isCursorRootChildren && isCursorLeaf)

  /** Gets the subthought that is not the cursor. */
  const subThoughtNotCursor = subthoughts => subthoughts.find(child => pathToContext(cursor).indexOf(child.value) === -1)

  return <Fragment>
    <p>Thoughts <i>within</i> thoughts are automatically hidden when you {isTouch ? 'tap' : 'click'} away.
      {
        cursor
          ? isCursorCollapsePossible
            ?
            <Fragment>
              <Fragment> Try {isTouch ? 'tapping' : 'clicking'} on </Fragment>
              <Fragment>thought "{ellipsize(subThoughtNotCursor(ancestorThoughtChildren).value)}" {ancestorThought.length !== 0 && `or "${ellipsize(head(ancestorThought))}"`} </Fragment>
              <Fragment> to hide{(isCursorLeaf ? headValue(cursor) : cursorChildren[0].value).length === 0 && ' the empty '} subthought{isCursorLeaf ? headValue(cursor) : ` "${ellipsize(cursorChildren[0].value)}"`}.</Fragment>
            </Fragment>

            :
            <Fragment> Add a subthought and I'll show you.</Fragment>

          : getAllChildren(state, [HOME_TOKEN]).length === 0 ? ' Oops! There are no thoughts in the tree. Please add some thoughts to continue with the tutorial.' : ' Oops! Please focus on one of the thoughts.'
      }
    </p>
  </Fragment>
}

export default TutorialStepAutoExpand
