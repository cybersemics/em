import { isEqual } from 'lodash'
import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import { HOME_TOKEN } from '../../constants'
import { getAllChildren, getAllChildrenAsThoughts, getChildrenRanked } from '../../selectors/getChildren'
import ellipsize from '../../util/ellipsize'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpandExpand = () => {
  const uncle = useSelector(state => {
    const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
    const noCursorThoughts = state.cursor ? rootChildren.filter(c => c.id !== state.cursor![0]) : rootChildren
    // The array that holds all the thoughts that that don't have a cursor, but have children.
    const thoughtsNoCursorWithChild = noCursorThoughts.filter(t => getAllChildren(state, t.id).length > 0)
    return thoughtsNoCursorWithChild[0]
  }, isEqual)

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
