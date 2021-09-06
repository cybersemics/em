import React, { Fragment } from 'react'
import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'

const { smallText, bold } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSuccess = () => (
  <Fragment>
    <Text style={smallText}>
      Huzzah... You have completed the tutorial. Creating thoughts and subthought is all you need to create a
      personalized thoughtspace. There's a lot more to <Text style={[smallText, bold]}>em</Text> however. Additional
      commands have been designed to facilitate a truly fluid sensemaking experience.
    </Text>
    <Text style={smallText}>How are you feeling? Would you like to learn more or play on your own?</Text>
  </Fragment>
)

export default TutorialStepSuccess
