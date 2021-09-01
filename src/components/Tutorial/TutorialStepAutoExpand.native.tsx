import React, { Fragment } from 'react'
import { store } from '../../store'

// constants
import { HOME_TOKEN } from '../../constants'

// util
import { parentOf, ellipsize, head, headValue, pathToContext } from '../../util'

// selectors
import { getAllChildren } from '../../selectors'

import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'
import { Child, Path } from '../../@types'

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpand = ({ cursor }: { cursor: Path }) => {
  const state = store.getState()
  const cursorContext = pathToContext(cursor || [])
  const cursorChildren = getAllChildren(state, cursorContext)
  const isCursorLeaf = cursorChildren.length === 0
  const ancestorThought = isCursorLeaf ? parentOf(parentOf(cursorContext)) : parentOf(cursorContext)

  const ancestorThoughtChildren = getAllChildren(state, ancestorThought.length === 0 ? [HOME_TOKEN] : ancestorThought)
  const isCursorRootChildren = (cursor || []).length === 1

  const isCursorCollapsePossible = ancestorThoughtChildren.length > 1 && !(isCursorRootChildren && isCursorLeaf)

  /** Gets the subthought that is not the cursor. */
  const subThoughtNotCursor = (subthoughts: Child[]) =>
    subthoughts.find(child => pathToContext(cursor).indexOf(child.value) === -1)

  return (
    <Fragment>
      <Text style={smallText}>
        Thoughts <Text style={[smallText, italic]}>within</Text> thoughts are automatically hidden when you tap away.
        {cursor ? (
          isCursorCollapsePossible ? (
            <Fragment>
              <Fragment> Try tapping on </Fragment>
              <Fragment>
                thought "{ellipsize(subThoughtNotCursor(ancestorThoughtChildren)?.value || '')}"{' '}
                {ancestorThought.length !== 0 && `or "${ellipsize(head(ancestorThought))}"`}{' '}
              </Fragment>
              <Fragment>
                {' '}
                to hide{(isCursorLeaf ? headValue(cursor) : cursorChildren[0].value).length === 0 && ' the empty '}{' '}
                subthought {isCursorLeaf ? headValue(cursor) : ` "${ellipsize(cursorChildren[0].value)}"`}.
              </Fragment>
            </Fragment>
          ) : (
            <Fragment> Add a subthought and I'll show you.</Fragment>
          )
        ) : getAllChildren(state, [HOME_TOKEN]).length === 0 ? (
          ' Oops! There are no thoughts in the tree. Please add some thoughts to continue with the tutorial.'
        ) : (
          ' Oops! Please focus on one of the thoughts.'
        )}
      </Text>
    </Fragment>
  )
}

export default TutorialStepAutoExpand
