import React, { Fragment } from 'react'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText, bold } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThought = () => (
  <Fragment>
    <Text style={smallText}>
      First, let me show you how to create a new thought in <Text style={[bold, smallText]}>em</Text> using a gesture
      Just follow the instructions; this tutorial will stay open.
    </Text>
    <Text style={smallText}>Trace the line below with your finger to create a new thought.</Text>
  </Fragment>
)

export default TutorialStepFirstThought
