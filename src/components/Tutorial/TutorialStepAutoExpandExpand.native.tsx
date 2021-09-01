import React from 'react'
import { store } from '../../store'
import { getAllChildren, getChildrenRanked } from '../../selectors'
import { ellipsize } from '../../util'
import { Text } from '../Text.native'
import { commonStyles } from '../../style/commonStyles'
import { Child, Path } from '../../@types'

const { smallText, bold } = commonStyles

interface IComponentProps {
  cursor: Path
  rootChildren: Child[]
}

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepAutoExpandExpand = ({ cursor, rootChildren = [] }: IComponentProps) => {
  const uncle = thoughtsNoCursorWithChild(cursor, rootChildren)[0]

  /** Gets the first child of the first thought in the root that is not the cursor. */
  const childWithNoCursorParent = uncle ? getChildrenRanked(store.getState(), [uncle.value])[0] : null

  const hiddenChild = ellipsize(childWithNoCursorParent?.value || '') || ''

  return (
    <>
      {childWithNoCursorParent ? <Text style={smallText}>Notice that "{hiddenChild}" is hidden now.</Text> : null}
      <Text style={smallText}>
        Well done. There are no files to open or close in <Text style={[smallText, bold]}>em</Text>. All your thoughts
        are connected in one big thoughtspace, but kept tidy through autofocus.
      </Text>
      <Text style={smallText}>
        Tap {uncle ? `"${ellipsize(uncle.value)}"` : 'a thought'} to reveal its subthought "{hiddenChild}".
      </Text>
    </>
  )
}

/**
 * @param cursor The array that display the thought string which has a cursor.
 * @param rootChildren The object array that show all the root thoughts.
 * @returns The array that holds all the thoughts that that don't have a cursor, but have children.
 */
const thoughtsNoCursorWithChild = (cursor: Path, rootChildren: Child[]) => {
  const noCursorThoughts = cursor ? rootChildren.filter(c => c.value !== cursor[0].value) : rootChildren
  return noCursorThoughts.filter(t => getAllChildren(store.getState(), [t.value]).length > 0)
}

export default TutorialStepAutoExpandExpand
