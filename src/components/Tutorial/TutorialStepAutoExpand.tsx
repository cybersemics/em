import React, { Fragment } from 'react'
import Path from '../../@types/Path'
import Thought from '../../@types/Thought'
import { isTouch } from '../../browser'
import { HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import { getAllChildren, getAllChildrenAsThoughts } from '../../selectors/getChildren'
import store from '../../stores/app'
import ellipsize from '../../util/ellipsize'
import head from '../../util/head'
import headValue from '../../util/headValue'
import parentOf from '../../util/parentOf'
import pathToContext from '../../util/pathToContext'

/** Tutorial: Auto Expand. */
const TutorialStepAutoExpand = ({ cursor }: { cursor?: Path } = {}) => {
  const state = store.getState()
  const cursorChildren = cursor ? getAllChildrenAsThoughts(state, head(cursor)) : []
  const isCursorLeaf = cursorChildren.length === 0
  const contextAncestor = cursor ? (isCursorLeaf ? parentOf(parentOf(cursor)) : parentOf(cursor)) : []
  const contextAncestorId = contextToThoughtId(state, contextAncestor)

  const ancestorThoughtChildren = getAllChildrenAsThoughts(
    state,
    contextAncestor.length === 0 ? HOME_TOKEN : contextAncestorId,
  )
  const isCursorRootChildren = (cursor || []).length === 1

  const isCursorCollapsePossible = ancestorThoughtChildren.length > 1 && !(isCursorRootChildren && isCursorLeaf)

  /** Gets the subthought that is not the cursor. */
  const subThoughtNotCursor = (subthoughts: Thought[]) =>
    cursor && subthoughts.find(child => pathToContext(state, cursor).indexOf(child.value) === -1)

  return (
    <Fragment>
      <p>
        Thoughts <i>within</i> thoughts are automatically hidden when you {isTouch ? 'tap' : 'click'} away.
        {cursor ? (
          isCursorCollapsePossible ? (
            <Fragment>
              <Fragment> Try {isTouch ? 'tapping' : 'clicking'} on </Fragment>
              <Fragment>
                thought "{ellipsize(subThoughtNotCursor(ancestorThoughtChildren)?.value || '')}"{' '}
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
