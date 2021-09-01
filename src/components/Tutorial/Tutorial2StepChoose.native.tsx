import React from 'react'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepChoose = () => (
  <Text style={smallText}>
    For this tutorial, choose what kind of content you want to create. You will learn the same command regardless of
    which one you choose.
  </Text>
)

export default Tutorial2StepChoose
