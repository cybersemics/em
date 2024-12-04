import { useSelector } from 'react-redux'
import { isMac, isTouch } from '../../browser'
import { commandById } from '../../commands'
import { HOME_TOKEN, TUTORIAL_CONTEXT, TUTORIAL_CONTEXT2_PARENT } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import { getAllChildrenAsThoughts } from '../../selectors/getChildren'
import selectTutorialChoice from '../../selectors/selectTutorialChoice'
import headValue from '../../util/headValue'
import TutorialGestureDiagram from './TutorialGestureDiagram'
import TutorialHint from './TutorialHint'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContext2 = () => {
  const tutorialChoice = useSelector(selectTutorialChoice)
  const readyToType = useSelector(state => {
    if (!state.cursor) return false
    const cursorThought = childIdsToThoughts(state, state.cursor)
    return cursorThought.length === 2 && cursorThought[0].value === TUTORIAL_CONTEXT2_PARENT[tutorialChoice]
  })
  const select = useSelector(
    state => !state.cursor || headValue(state, state.cursor) !== TUTORIAL_CONTEXT2_PARENT[tutorialChoice],
  )
  const context2Exists = useSelector(state => {
    const rootChildren = getAllChildrenAsThoughts(state, HOME_TOKEN)
    return rootChildren.find(
      child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase(),
    )
  })

  return (
    <>
      <p>
        Now add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “
        {TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”.
      </p>
      {
        // e.g. Work
        context2Exists ? (
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
              {!select && <TutorialGestureDiagram gesture={commandById('newSubthought')?.gesture} />}
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
