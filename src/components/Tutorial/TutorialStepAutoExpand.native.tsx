import React, { Fragment } from 'react'
import { store } from '../../store'
import { HOME_TOKEN } from '../../constants'
import { parentOf, ellipsize, head, headValue, pathToContext } from '../../util'
import { contextToThoughtId, getAllChildren } from '../../selectors'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'
import { Path, Thought } from '../../@types'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpand = ({ cursor }: { cursor: Path }) => {
  const state = store.getState()
  const cursorContext = pathToContext(state, cursor || [])
  const cursorChildren = cursor ? getAllChildrenAsThoughts(state, head(cursor)) : []
  const isCursorLeaf = cursorChildren.length === 0
  const contextAncestor = isCursorLeaf ? parentOf(parentOf(cursorContext)) : parentOf(cursorContext)
  const contextAncestorId = contextToThoughtId(state, contextAncestor)

  const ancestorThoughtChildren = getAllChildrenAsThoughts(
    state,
    contextAncestor.length === 0 ? HOME_TOKEN : contextAncestorId,
  )
  const isCursorRootChildren = (cursor || []).length === 1

  const isCursorCollapsePossible = ancestorThoughtChildren.length > 1 && !(isCursorRootChildren && isCursorLeaf)

  /** Gets the subthought that is not the cursor. */
  const subThoughtNotCursor = (subthoughts: Thought[]) =>
    subthoughts.find(child => cursorContext.indexOf(child.value) === -1)

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
      </Text>
    </Fragment>
  )
}

export default TutorialStepAutoExpand
