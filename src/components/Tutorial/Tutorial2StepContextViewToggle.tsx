import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT } from '../../constants'
import getContexts from '../../selectors/getContexts'
import getSetting from '../../selectors/getSetting'
import { formatKeyboardShortcut, shortcutById } from '../../shortcuts'
import headValue from '../../util/headValue'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewToggle = ({ tutorialChoice }: { tutorialChoice: keyof typeof TUTORIAL_CONTEXT }) => {
  const caseSensitiveValue = useSelector(state =>
    getContexts(state, TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase(),
  )
  const notSelected = useSelector(state => !state.cursor || headValue(state, state.cursor) !== caseSensitiveValue)

  const isHint = useSelector(state => {
    const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)
    return tutorialStep !== Math.floor(tutorialStep)
  })
  return (
    <>
      {notSelected ? (
        <p>First select "{caseSensitiveValue}".</p>
      ) : (
        <>
          {isHint ? (
            <p>
              You did the right gesture, but somehow "{caseSensitiveValue}" wasn't selected. Try
              {notSelected ? <> selecting "{caseSensitiveValue}" and trying</> : null} again.
            </p>
          ) : null}
          <p>
            {isTouch
              ? 'Trace the line below'
              : `Hit ${formatKeyboardShortcut(shortcutById('toggleContextView')!.keyboard!)}`}{' '}
            to view the current thought's contexts.
          </p>
        </>
      )}
    </>
  )
}

export default Tutorial2StepContextViewToggle
