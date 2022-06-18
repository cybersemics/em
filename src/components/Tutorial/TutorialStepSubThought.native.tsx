import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import Path from '../../@types/Path'
import State from '../../@types/State'
import { commonStyles } from '../../style/commonStyles'
import headValue from '../../util/headValue'
import { Text } from '../Text.native'

interface IComponentProps {
  cursor: Path
}

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSubThought = ({ cursor }: IComponentProps) => {
  const state = useStore<State>().getState()

  return (
    <Fragment>
      <Text style={smallText}>
        Now I am going to show you how to add a thought <Text style={[smallText, italic]}>within</Text> another thought.
      </Text>
      {cursor && headValue(state, cursor) === '' ? (
        <Text style={smallText}>
          Hit the Delete key to delete the current blank thought. It's not needed right now.
        </Text>
      ) : null}
      {!cursor ? (
        <Text style={smallText}>Tap a thought to select it.</Text>
      ) : (
        <Text style={smallText}>Trace the line below</Text>
      )}
    </Fragment>
  )
}

export default TutorialStepSubThought
