import { useSelector } from 'react-redux'
import Path from '../../@types/Path'
import { isMac, isTouch } from '../../browser'
import {
  HOME_TOKEN,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import headValue from '../../util/headValue'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1 = ({
  cursor,
  tutorialChoice,
}: {
  cursor: Path | null
  tutorialChoice: keyof typeof TUTORIAL_CONTEXT
}) => {
  const cursorValue = useSelector(state => state.cursor && headValue(state, state.cursor))
  const context1Exists = useSelector(state => {
    const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
    return rootChildren.find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase(),
    )
  })

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
        Add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “
        {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”.
      </p>
      {context1Exists ? (
        <p>
          Do you remember how to do it?
          <TutorialHint>
            <br />
            <br />
            {!cursor || cursorValue?.toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
              ? `Select "${TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". `
              : null}
            {isTouch ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`} to
            create a new thought <i>within</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "
            {TUTORIAL_CONTEXT[tutorialChoice]}".
          </TutorialHint>
        </p>
      ) : (
        <p>
          Oops, somehow “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to go
          back.
        </p>
      )}
    </>
  )
}

export default Tutorial2StepContext1
