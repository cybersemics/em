import { View } from 'moti'
import React, { Fragment } from 'react'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText, bold, marginVertical, marginLeft } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewExamples = () => (
  <Fragment>
    <Text style={smallText}>
      Here are some real-world examples of using contexts in <Text style={[smallText, bold]}>em</Text>:
    </Text>
    <View style={[marginVertical, marginLeft]}>
      <Text style={smallText}>View all thoughts related to a particular person, place, or thing.</Text>
      <Text style={smallText}>Keep track of quotations from different sources.</Text>
      <Text style={smallText}>Create a link on the home screen to a deeply nested subthought for easy access.</Text>
    </View>
    <Text style={smallText}>
      The more thoughts you add to <Text style={[smallText, bold]}>em</Text>, the more useful this feature will become.
    </Text>
  </Fragment>
)

export default Tutorial2StepContextViewExamples
