import React, { Fragment } from 'react'
import TutorialHint from './TutorialHint'

import { ellipsize, headValue, joinConjunction } from '../../util'

import { TUTORIAL_CONTEXT1_PARENT } from '../../constants'
import { Child, Path } from '../../@types'
import { Text } from '../Text.native'
import { commonStyles } from '../../style/commonStyles'

type TutorialChoice = typeof TUTORIAL_CONTEXT1_PARENT

interface IComponentProps {
  cursor: Path
  rootChildren: Child[]
  tutorialChoice: keyof TutorialChoice
}

const { smallText, italic } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1Parent = ({ cursor, tutorialChoice, rootChildren }: IComponentProps) => (
  <Fragment>
    <Text style={smallText}>
      Let's begin! Create a new thought with the text “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”
      {cursor && headValue(cursor).startsWith('"') ? ' (without quotes)' : null}.
    </Text>
    <Text style={smallText}>
      You should create this thought at the top level, i.e. not <Text style={[smallText, italic]}>within</Text> any
      other thoughts.
    </Text>

    <TutorialHint>
      {rootChildren.length > 0 && (!cursor || cursor.length > 1) ? (
        <Text>
          Select {rootChildren.length === 1 ? 'the top-level thought' : 'one of the top-level thoughts'} (
          {joinConjunction(
            rootChildren.map(child => `"${ellipsize(child.value)}"`),
            'or',
          )}
          ).{' '}
        </Text>
      ) : null}
      <Text style={smallText}>
        Trace the line below with your finger' to create a new thought. Then type "
        {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}".
      </Text>
    </TutorialHint>
  </Fragment>
)

export default Tutorial2StepContext1Parent
