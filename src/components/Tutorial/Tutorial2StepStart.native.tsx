import React, { Fragment } from 'react'
import { commonStyles } from '../../style/commonStyles'
import StaticSuperscript from '../StaticSuperscript'
import { Text } from '../Text.native'

const { smallText, bold } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepStart = () => (
  <Fragment>
    <Text style={smallText}>
      If the same thought appears in more than one place, <Text style={[smallText, bold]}>em</Text> shows a small number
      to the right of the thought, for example: (<StaticSuperscript n={3} />
      ).
    </Text>
    <Text style={smallText}>Let's see this in action.</Text>
  </Fragment>
)

export default Tutorial2StepStart
