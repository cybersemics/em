import React, { Fragment } from 'react'
import { store } from '../../store'
import { isMobile } from '../../browser'

// constants
import { ROOT_TOKEN } from '../../constants'

// util
import {
  contextOf,
  ellipsize,
  head,
  headValue,
  pathToContext,
} from '../../util'

// selectors
import {
  getThoughts,
} from '../../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpand = ({ cursor, rootSubthoughts = [] } = {}) => {

  const state = store.getState()
  const cursorContext = pathToContext(cursor || [])
  const cursorChildren = getThoughts(state, cursorContext)
  const isCursorLeaf = cursorChildren.length === 0
  const ancestorThought = isCursorLeaf ? contextOf(contextOf(cursorContext)) : contextOf(cursorContext)

  const ancestorThoughtChildren = getThoughts(state, ancestorThought.length === 0 ? [ROOT_TOKEN] : ancestorThought)
  const isCursorRootChildren = (cursor || []).length === 1

  const isCursorCollapsePossible = ancestorThoughtChildren.length > 1 && !(isCursorRootChildren && isCursorLeaf)

  /** Gets the subthought that is not the cursor. */
  const subThoughtNotCursor = subthoughts => subthoughts.find(child => pathToContext(cursor).indexOf(child.value) === -1)

  return <Fragment>
    <p>Thoughts <i>within</i> thoughts are automatically hidden when you {isMobile ? 'tap' : 'click'} away.
      {
        cursor
          ? isCursorCollapsePossible
            ?
            <Fragment>
              <Fragment> Try {isMobile ? 'tapping' : 'clicking'} on </Fragment>
              <Fragment>thought "{ellipsize(subThoughtNotCursor(ancestorThoughtChildren).value)}" {ancestorThought.length !== 0 && `or "${ellipsize(head(ancestorThought))}"`} </Fragment>
              <Fragment> to hide{(isCursorLeaf ? headValue(cursor) : cursorChildren[0].value).length === 0 && ' the empty '} subthought{isCursorLeaf ? headValue(cursor) : ` "${ellipsize(cursorChildren[0].value)}"`}.</Fragment>
            </Fragment>

            :
            <Fragment> Oops! With current state no thoughts will hide on click away. Try expanding some thoughts or maybe add some sibling thoughts and subthoughts just like you learned in previous tutorials.</Fragment>

          : getThoughts(state, [ROOT_TOKEN]).length === 0 ? ' Oops! There are no thoughts in the tree. Please add some thoughts to continue with the tutorial.' : ' Oops! Please focus on one of the thoughts.'
      }
    </p>
  </Fragment>
}

export default TutorialStepAutoExpand
