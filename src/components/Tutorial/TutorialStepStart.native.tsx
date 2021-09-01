import React, { Fragment } from 'react'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText } = commonStyles
// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepStart = () => (
  <Fragment>
    <Text style={smallText}>Welcome to your personal thoughtspace.</Text>
    <Text style={smallText}>Don't worry. I will walk you through everything you need to know.</Text>
    <Text style={smallText}>Let's begin...</Text>
  </Fragment>
)

export default TutorialStepStart
