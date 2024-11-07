import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Path from '../../@types/Path'
import Thought from '../../@types/Thought'
import { tutorialStepActionCreator as setTutorialStep } from '../../actions/tutorialStep'
import { isTouch } from '../../browser'
import { HOME_TOKEN } from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import { getAllChildren, getAllChildrenAsThoughts } from '../../selectors/getChildren'
import getSetting from '../../selectors/getSetting'
import store from '../../stores/app'
import ellipsize from '../../util/ellipsize'
import hashPath from '../../util/hashPath'
import head from '../../util/head'
import headValue from '../../util/headValue'
import parentOf from '../../util/parentOf'
import pathToContext from '../../util/pathToContext'

/** Tutorial: Auto Expand. */
const TutorialStepAutoExpand = ({ cursor }: { cursor?: Path } = {}) => {
  const state = store.getState()
  const tutorialStep = useSelector(state => +getSetting(state, 'Tutorial Step')!)
  const dispatch = useDispatch()
  const cursorChildren = cursor ? getAllChildrenAsThoughts(state, head(cursor)) : []
  const isCursorLeaf = cursorChildren.length === 0
  const contextAncestor = cursor ? (isCursorLeaf ? parentOf(parentOf(cursor)) : parentOf(cursor)) : []
  const contextAncestorId = contextToThoughtId(state, contextAncestor)
  const pathToCollapse = useRef<Path | null>(cursor && cursor.length > 1 ? cursor : null)

  const ancestorThoughtChildren = getAllChildrenAsThoughts(
    state,
    contextAncestor.length === 0 ? HOME_TOKEN : contextAncestorId,
  )
  const isCursorRootChildren = (cursor || []).length === 1

  const isCursorCollapsePossible = ancestorThoughtChildren.length > 1 && !(isCursorRootChildren && isCursorLeaf)

  const isParentCollapsed = useSelector(
    state => pathToCollapse.current && !state.expanded[hashPath(parentOf(pathToCollapse.current))],
  )

  // It is possible that pathToCollapse is null if the cursor was moved before advancing from the previous tutorial step, or if this tutorial step was selected out of order via the tutorial navigation.
  // Update pathToCollapse when the cursor becomes valid again to avoid getting stuck in this step.
  useEffect(() => {
    if (cursor && cursor.length > 1) {
      pathToCollapse.current = cursor
    }
  }, [cursor])

  // advance tutoriral when parent is collapsed
  useEffect(
    () => {
      if (isParentCollapsed) {
        dispatch(setTutorialStep({ value: tutorialStep + 1 }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, isParentCollapsed, setTutorialStep],
  )

  /** Gets the subthought that is not the cursor. */
  const subThoughtNotCursor = (subthoughts: Thought[]) =>
    cursor && subthoughts.find(child => pathToContext(state, cursor).indexOf(child.value) === -1)

  return (
    <>
      <p>
        Thoughts <i>within</i> thoughts are automatically hidden when you {isTouch ? 'tap' : 'click'} away.
        {cursor ? (
          isCursorCollapsePossible ? (
            <>
              <> Try {isTouch ? 'tapping' : 'clicking'} on </>
              <>
                thought "{ellipsize(subThoughtNotCursor(ancestorThoughtChildren)?.value || '')}"{' '}
                {contextAncestor.length !== 0 && `or "${ellipsize(head(contextAncestor))}"`}{' '}
              </>
              <>
                {' '}
                to hide
                {(isCursorLeaf ? headValue(state, cursor) : cursorChildren[0].value).length === 0 && ' the empty '}{' '}
                subthought
                {ellipsize(
                  isCursorLeaf && headValue(state, cursor).length > 0
                    ? ` "${headValue(state, cursor)}"`
                    : cursorChildren[0]?.value
                      ? `"${cursorChildren[0]?.value}"`
                      : '',
                )}
                .
              </>
            </>
          ) : (
            <> Add a subthought and I'll show you.</>
          )
        ) : getAllChildren(state, HOME_TOKEN).length === 0 ? (
          ' Oops! There are no thoughts in your thoughtspace. Please add some thoughts to continue with the tutorial.'
        ) : (
          ' Please focus on one of the thoughts.'
        )}
      </p>
    </>
  )
}

export default TutorialStepAutoExpand
