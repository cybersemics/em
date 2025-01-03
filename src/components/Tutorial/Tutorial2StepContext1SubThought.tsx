import { useSelector } from 'react-redux'
import { isMac, isTouch } from '../../browser'
import { commandById } from '../../commands'
import {
  HOME_TOKEN,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
import contextToThoughtId from '../../selectors/contextToThoughtId'
import { getAllChildrenAsThoughts, getChildrenRanked } from '../../selectors/getChildren'
import selectTutorialChoice from '../../selectors/selectTutorialChoice'
import headValue from '../../util/headValue'
import TutorialGestureDiagram from './TutorialGestureDiagram'
import TutorialHint from './TutorialHint'
import context1SubthoughtCreated from './utils/context1SubthoughtCreated'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1SubThought = () => {
  const tutorialChoice = useSelector(selectTutorialChoice)
  const context1SubthoughtisCreated = useSelector(state => context1SubthoughtCreated(state, { tutorialChoice }))
  const select = useSelector(
    state =>
      !state.cursor || headValue(state, state.cursor)?.toLowerCase() !== TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
  )
  const context1Exists = useSelector(state => {
    const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
    return rootChildren.find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase(),
    )
  })
  const tryItYourself = useSelector(state => {
    const tutorialChoiceId = contextToThoughtId(state, [TUTORIAL_CONTEXT1_PARENT[tutorialChoice]])
    return (
      tutorialChoiceId &&
      getChildrenRanked(state, tutorialChoiceId).find(
        child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase(),
      )
    )
  })

  if (context1SubthoughtisCreated) {
    return (
      <>
        <p>Nice work!</p>
        <p>{isTouch ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p>
      </>
    )
  }

  return (
    <>
      <p>
        Now add a thought to “{TUTORIAL_CONTEXT[tutorialChoice]}”.{' '}
        {tutorialChoice === TUTORIAL_VERSION_TODO
          ? "This could be any task you'd like to get done."
          : tutorialChoice === TUTORIAL_VERSION_JOURNAL
            ? 'This could be a specific person or a general thought about relationships.'
            : tutorialChoice === TUTORIAL_VERSION_BOOK
              ? 'You can just make up something about Psychology you could imagine hearing on a podcast.'
              : null}
      </p>
      {
        // e.g. Home
        context1Exists &&
        // e.g. Home/To Do
        tryItYourself ? (
          <p>
            Do you remember how to do it?
            <TutorialHint>
              <br />
              <br />
              {select ? `Select "${TUTORIAL_CONTEXT[tutorialChoice]}". ` : null}
              {isTouch ? 'Trace the line below with your finger ' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter `}
              to create a new thought <i>within</i> "{TUTORIAL_CONTEXT[tutorialChoice]}".
              {!select && <TutorialGestureDiagram gesture={commandById('newSubthought').gesture} />}
            </TutorialHint>
          </p>
        ) : (
          <p>
            Oops, somehow “{TUTORIAL_CONTEXT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.
          </p>
        )
      }
    </>
  )
}

export default Tutorial2StepContext1SubThought
