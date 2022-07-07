import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import { commonStyles } from '../../style/commonStyles'
import headValue from '../../util/headValue'
import { Text } from '../Text.native'

interface IComponentProps {
  cursor: Path
}

const { smallText } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThoughtEnter = ({ cursor }: IComponentProps) => {
  const state = useStore().getState()
  return (
    <Fragment>
      <Text style={smallText}>You did it!</Text>
      {!cursor || headValue(state, cursor).length > 0 ? (
        <Text style={smallText}>Tap the Next button when you are done entering your thought.</Text>
      ) : (
        <Text style={smallText}>Now type something. Anything will do.</Text>
      )}
    </Fragment>
  )
}
export default TutorialStepFirstThoughtEnter
