import React, { Fragment } from 'react'
import { store } from '../../store'
import { isTouch } from '../../browser'
import { HOME_TOKEN } from '../../constants'
import parentOf from '../../util/parentOf'
import ellipsize from '../../util/ellipsize'
import head from '../../util/head'
import headValue from '../../util/headValue'
import pathToContext from '../../util/pathToContext'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import { getAllChildren } from '../../selectors/getChildren'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpand = ({ cursor } = {}) => {
  const state = store.getState()
  const cursorContext = pathToContext(state, cursor || [])
  const cursorChildren = getAllChildren(state, cursorContext)
  const isCursorLeaf = cursorChildren.length === 0
  const contextAncestor = isCursorLeaf ? parentOf(parentOf(cursorContext)) : parentOf(cursorContext)
  const contextAncestorId = contextToThoughtId(state, contextAncestor)

  const ancestorThoughtChildren = getAllChildren(state, contextAncestor.length === 0 ? HOME_TOKEN : contextAncestorId)
  const isCursorRootChildren = (cursor || []).length === 1

  const isCursorCollapsePossible = ancestorThoughtChildren.length > 1 && !(isCursorRootChildren && isCursorLeaf)

  /** Gets the subthought that is not the cursor. */
  const subThoughtNotCursor = subthoughts =>
    subthoughts.find(child => pathToContext(state, cursor).indexOf(child.value) === -1)

  return (
    <Fragment>
      <p>
        Thoughts <i>within</i> thoughts are automatically hidden when you {isTouch ? 'tap' : 'click'} away.
        {cursor ? (
          isCursorCollapsePossible ? (
            <Fragment>
              <Fragment> Try {isTouch ? 'tapping' : 'clicking'} on </Fragment>
              <Fragment>
                thought "{ellipsize(subThoughtNotCursor(ancestorThoughtChildren).value)}"{' '}
                {contextAncestor.length !== 0 && `or "${ellipsize(head(contextAncestor))}"`}{' '}
              </Fragment>
              <Fragment>
                {' '}
                to hide
                {(isCursorLeaf ? headValue(state, cursor) : cursorChildren[0].value).length === 0 && ' the empty '}{' '}
                subthought {isCursorLeaf ? headValue(state, cursor) : ` "${ellipsize(cursorChildren[0].value)}"`}.
              </Fragment>
            </Fragment>
          ) : (
            <Fragment> Add a subthought and I'll show you.</Fragment>
          )
        ) : getAllChildren(state, HOME_TOKEN).length === 0 ? (
          ' Oops! There are no thoughts in the tree. Please add some thoughts to continue with the tutorial.'
        ) : (
          ' Oops! Please focus on one of the thoughts.'
        )}
      </p>
    </Fragment>
  )
}

export default TutorialStepAutoExpand
