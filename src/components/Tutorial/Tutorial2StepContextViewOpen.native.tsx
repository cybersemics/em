import React, { Fragment } from 'react'
import { store } from '../../store'

import { getThoughtIdByContext } from '../../util'
import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'

// selectors
import { getContexts } from '../../selectors'

import { Child, Path } from '../../@types'
import { Text } from '../Text.native'
import { commonStyles } from '../../style/commonStyles'
import { doStringsMatch } from '../../util/doStringsMatch'

type TutorialChoice = typeof TUTORIAL_CONTEXT1_PARENT

interface IComponentProps {
  cursor: Path
  contextViews: Child[]
  tutorialChoice: keyof TutorialChoice
}

const { smallText, bold } = commonStyles

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewOpen = ({ cursor, tutorialChoice, contextViews }: IComponentProps) => {
  const caseSensitiveValue =
    getContexts(store.getState(), TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()

  const context = getThoughtIdByContext([
    (cursor && doStringsMatch(cursor[0].value, TUTORIAL_CONTEXT1_PARENT[tutorialChoice])
      ? TUTORIAL_CONTEXT1_PARENT
      : TUTORIAL_CONTEXT2_PARENT)[tutorialChoice],
    TUTORIAL_CONTEXT[tutorialChoice],
  ]) as unknown as number

  return !cursor ||
    !cursor.some(
      child =>
        doStringsMatch(child.value, TUTORIAL_CONTEXT1_PARENT[tutorialChoice]) ||
        doStringsMatch(child.value, TUTORIAL_CONTEXT2_PARENT[tutorialChoice]) ||
        doStringsMatch(child.value, TUTORIAL_CONTEXT[tutorialChoice]),
    ) ? (
    <Text style={smallText}>
      Oops, "{caseSensitiveValue}" is hidden because the selection changed. Select "
      {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" or "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}" to show it again.
    </Text>
  ) : !contextViews[context] ? (
    <Text style={smallText}>Oops, somehow the context view was closed. Click the Prev button to go back.</Text>
  ) : (
    <Fragment>
      <Text style={smallText}>
        Well, look at that. We now see all of the contexts in which "{caseSensitiveValue}" appears, namely "
        {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" and "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".{' '}
      </Text>
      <Text style={smallText}>
        You can select a context from this list to view its subthoughts without having to navigate to its original
        location.
      </Text>
      <Text style={smallText}>
        There are no manual links in <Text style={[smallText, bold]}>em</Text>. By typing the same thought in multiple
        contexts, they will automatically be linked.
      </Text>
    </Fragment>
  )
}

export default Tutorial2StepContextViewOpen
