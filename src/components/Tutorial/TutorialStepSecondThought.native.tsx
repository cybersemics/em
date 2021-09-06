import React, { Fragment } from 'react'
import TutorialHint from './TutorialHint'

import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSecondThought = () => (
  <Fragment>
    <Text style={smallText}>Well done!</Text>
    <Text style={smallText}>Try adding another thought. Do you remember how to do it?</Text>
    <TutorialHint>
      <Text style={smallText}>Trace the line below with your finger to create a new thought.</Text>
    </TutorialHint>
  </Fragment>
)

export default TutorialStepSecondThought
