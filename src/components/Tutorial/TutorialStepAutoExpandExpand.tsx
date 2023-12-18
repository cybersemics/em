import { useSelector } from 'react-redux'
import State from '../../@types/State'
import Thought from '../../@types/Thought'
import { isTouch } from '../../browser'
import { getAllChildren, getChildrenRanked } from '../../selectors/getChildren'
import ellipsize from '../../util/ellipsize'

/**
 * @param cursor The array that display the thought string which has a cursor.
 * @param rootChildren The object array that show all the root thoughts.
 * @returns The array that holds all the thoughts that that don't have a cursor, but have children.
 */
const thoughtsNoCursorWithChild = (state: State, rootChildren: Thought[]): Thought[] => {
  const noCursorThoughts = state.cursor ? rootChildren.filter(c => c.id !== state.cursor![0]) : rootChildren
  return noCursorThoughts.filter(t => getAllChildren(state, t.id).length > 0)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpandExpand = ({ rootChildren = [] }: { rootChildren: Thought[] }) => {
  const uncle = useSelector(state => thoughtsNoCursorWithChild(state, rootChildren)[0])

  /** Gets the first child of the first thought in the root that is not the cursor. */
  const childWithNoCursorParent = useSelector(state => (uncle ? getChildrenRanked(state, uncle.id)[0] : null))

  const hiddenChild = (childWithNoCursorParent && ellipsize(childWithNoCursorParent?.value)) || ''

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

export default TutorialStepAutoExpandExpand
