import React, { Fragment } from 'react'
import { headValue } from '../../util'

import { commonStyles } from '../../style/commonStyles'
import { Text } from '../Text.native'
import { Path } from '../../@types'

interface IComponentProps {
  cursor: Path
}

const { smallText } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThoughtEnter = ({ cursor }: IComponentProps) => (
  <Fragment>
    <Text style={smallText}>You did it!</Text>
    {!cursor || headValue(cursor).length > 0 ? (
      <Text style={smallText}>Tap the Next button when you are done entering your thought.</Text>
    ) : (
      <Text style={smallText}>Now type something. Anything will do.</Text>
    )}
  </Fragment>
)

export default TutorialStepFirstThoughtEnter
