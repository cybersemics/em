import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import GesturePath from '../../@types/GesturePath'
import Path from '../../@types/Path'
import { shortcutById } from '../../shortcuts'
import { commonStyles } from '../../style/commonStyles'
import headValue from '../../util/headValue'
import GestureDiagram from '../GestureDiagram'
import { Text } from '../Text.native'

const newThoughtShortcut = shortcutById('newThought')

const { smallText, italic } = commonStyles

interface IComponentProps {
  cursor: Path
}
// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSecondThoughtEnter = ({ cursor }: IComponentProps) => {
  const state = useStore().getState()
  return (
    <Fragment>
      <Text style={smallText}>Good work!</Text>
      <Text style={smallText}>
        Swiping <GestureDiagram path={newThoughtShortcut?.gesture as GesturePath} size={28} />
        will always create a new thought <Text style={[smallText, italic]}>after</Text> the currently selected thought.
      </Text>
      {!cursor || headValue(state, cursor).length > 0 ? (
        <Text style={smallText}>Wonderful. Click the Next button when you are ready to continue.</Text>
      ) : (
        <Text style={smallText}>Now type some text for the new thought.</Text>
      )}
    </Fragment>
  )
}

export default TutorialStepSecondThoughtEnter
