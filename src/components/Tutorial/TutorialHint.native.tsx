import React from 'react'
import { StyleSheet } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useDispatch, useSelector } from 'react-redux'
import { State } from '../../@types'
import { tutorialStep as setTutorialStep } from '../../action-creators'
import { getSetting } from '../../selectors'

import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText } = commonStyles

/** Renders a hint button that will advance the tutorial by a fractional step and show a hint. */
const TutorialHint: React.FC = ({ children }) => {
  const dispatch = useDispatch()
  const tutorialStep = useSelector((state: State) => +(getSetting(state, 'Tutorial Step') || 0))
  // fractional steps are hints
  const hint = tutorialStep !== Math.floor(tutorialStep)

  return (
    <TouchableOpacity
      disabled={hint}
      onPress={() => dispatch(setTutorialStep({ value: tutorialStep + 0.1 }))}
      style={styles.hint}
    >
      {!hint ? <Text style={smallText}>hint</Text> : children}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  hint: {
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#999',
    margin: 10,
    borderRadius: 5,
  },
})

export default TutorialHint
