import { useSelector } from 'react-redux'
import { isMac, isTouch } from '../../browser'
import newSubthoughtCommand from '../../commands/newSubthought'
import {
  HOME_TOKEN,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import selectTutorialChoice from '../../selectors/selectTutorialChoice'
import headValue from '../../util/headValue'
import TutorialGestureDiagram from './TutorialGestureDiagram'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1 = () => {
  const tutorialChoice = useSelector(selectTutorialChoice)
  const chosenTutorialText = TUTORIAL_CONTEXT1_PARENT[tutorialChoice]
  const context1Exists = useSelector(state => {
    const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
    return rootChildren.find(child => child.value.toLowerCase() === chosenTutorialText.toLowerCase())
  })
  const readyToSelect = useSelector(
    state => !state.cursor || headValue(state, state.cursor)?.toLowerCase() !== chosenTutorialText.toLowerCase(),
  )

  return (
    <>
      <p>
        Let's say that{' '}
        {tutorialChoice === TUTORIAL_VERSION_TODO
          ? 'you want to make a list of things you have to do at home.'
          : tutorialChoice === TUTORIAL_VERSION_JOURNAL
            ? 'one of the themes in your journal is "Relationships".'
            : tutorialChoice === TUTORIAL_VERSION_BOOK
              ? `you hear a podcast on ${TUTORIAL_CONTEXT[tutorialChoice]}.`
              : null}{' '}
        Add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “{chosenTutorialText}”.
      </p>
      {context1Exists ? (
        <p>
          Do you remember how to do it?
          <TutorialHint>
            <br />
            <br />
            {readyToSelect ? `Select "${chosenTutorialText}". ` : null}
            {isTouch ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`} to
            create a new thought <i>within</i> "{chosenTutorialText}". Then type "{TUTORIAL_CONTEXT[tutorialChoice]}".
            {!readyToSelect && <TutorialGestureDiagram gesture={newSubthoughtCommand.gesture} />}
          </TutorialHint>
        </p>
      ) : (
        <p>Oops, somehow “{chosenTutorialText}” was changed or deleted. Click the Prev button to go back.</p>
      )}
    </>
  )
}

export default Tutorial2StepContext1
