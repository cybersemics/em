import { useSelector } from 'react-redux'
import Path from '../../@types/Path'
import Thought from '../../@types/Thought'
import { isMac, isTouch } from '../../browser'
import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import headValue from '../../util/headValue'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2 = ({
  tutorialChoice,
  rootChildren,
  cursor,
}: {
  cursor: Path | null
  tutorialChoice: keyof typeof TUTORIAL_CONTEXT
  rootChildren: Thought[]
}) => {
  const readyToType = useSelector(state => {
    if (!state.cursor) return false
    const cursorThought = childIdsToThoughts(state, state.cursor)
    return cursorThought.length === 2 && cursorThought[0].value === TUTORIAL_CONTEXT2_PARENT[tutorialChoice]
  })
  const select = useSelector(state => !cursor || headValue(state, cursor) !== TUTORIAL_CONTEXT2_PARENT[tutorialChoice])

  return (
    <>
      <p>
        Now add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “
        {TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”.
      </p>
      {
        // e.g. Work
        rootChildren.find(
          child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase(),
        ) ? (
          <p>
            Do you remember how to do it?
            <TutorialHint>
              <br />
              <br />
              {readyToType ? (
                `Type "${TUTORIAL_CONTEXT[tutorialChoice]}."`
              ) : (
                <>
                  {select ? `Select "${TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}". ` : null}
                  {isTouch
                    ? 'Trace the line below with your finger'
                    : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`}{' '}
                  to create a new thought <i>within</i> "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".
                </>
              )}
            </TutorialHint>
          </p>
        ) : (
          <p>
            Oops, somehow “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to
            go back.
          </p>
        )
      }
    </>
  )
}

export default Tutorial2StepContext2
