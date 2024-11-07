import { useSelector } from 'react-redux'
import Path from '../../@types/Path'
import Thought from '../../@types/Thought'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT, TUTORIAL_CONTEXT1_PARENT } from '../../constants'
import ellipsize from '../../util/ellipsize'
import headValue from '../../util/headValue'
import joinConjunction from '../../util/joinConjunction'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext1Parent = ({
  cursor,
  tutorialChoice,
  rootChildren,
}: {
  cursor: Path | null
  tutorialChoice: keyof typeof TUTORIAL_CONTEXT
  rootChildren: Thought[]
}) => {
  const hasQuotes = useSelector(state => state.cursor && headValue(state, state.cursor).startsWith('"'))

  return (
    <>
      <p>
        Let's begin! Create a new thought with the text “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”
        {hasQuotes ? ' (without quotes)' : null}.
      </p>
      <p>
        You should create this thought at the top level, i.e. not <i>within</i> any other thoughts.
        <TutorialHint>
          <br />
          <br />
          {rootChildren.length > 0 && (!cursor || cursor.length > 1) ? (
            <>
              Select {rootChildren.length === 1 ? 'the top-level thought' : 'one of the top-level thoughts'} (
              {joinConjunction(
                rootChildren.map(child => `"${ellipsize(child.value)}"`),
                'or',
              )}
              ).{' '}
            </>
          ) : null}
          {isTouch ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought. Then type "
          {TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}".
        </TutorialHint>
      </p>
    </>
  )
}

export default Tutorial2StepContext1Parent
