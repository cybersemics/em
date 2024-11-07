import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import {
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
import headValue from '../../util/headValue'
import TutorialHint from './TutorialHint'

const tutorialChoiceMap = {
  [TUTORIAL_VERSION_TODO]: null,
  [TUTORIAL_VERSION_JOURNAL]: 'You probably talk about relationships in therapy. ',
  [TUTORIAL_VERSION_BOOK]: 'This time imagine reading a book about Psychology. ',
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2Parent = ({ tutorialChoice }: { tutorialChoice: keyof typeof TUTORIAL_CONTEXT }) => {
  const hasQuotes = useSelector(state => state.cursor && headValue(state, state.cursor).startsWith('"'))
  const readyToSelect = useSelector(
    state =>
      !state.cursor ||
      headValue(state, state.cursor).toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase(),
  )

  return (
    <>
      <p>Now we are going to create a different "{TUTORIAL_CONTEXT[tutorialChoice]}" list.</p>
      <p>
        {tutorialChoiceMap[tutorialChoice] || null}
        Create a new thought with the text “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”
        {hasQuotes ? ' (without quotes)' : null} <i>after</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" (but at the
        same level).
        <TutorialHint>
          <br />
          <br />
          {readyToSelect ? (
            <>Select "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}." </>
          ) : (
            <>
              {isTouch ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought{' '}
              <i>after</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "
              {TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".
            </>
          )}
        </TutorialHint>
      </p>
    </>
  )
}

export default Tutorial2StepContext2Parent
