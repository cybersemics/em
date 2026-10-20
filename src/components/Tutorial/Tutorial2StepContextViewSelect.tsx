import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT } from '../../constants'
import useEditorSelector from '../../hooks/useEditorSelector'
import getContexts from '../../selectors/getContexts'
import selectTutorialChoice from '../../selectors/selectTutorialChoice'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewSelect = () => {
  const tutorialChoice = useEditorSelector(selectTutorialChoice)
  const caseSensitiveValue = useEditorSelector(state =>
    getContexts(state, TUTORIAL_CONTEXT[tutorialChoice]).length > 0
      ? TUTORIAL_CONTEXT[tutorialChoice]
      : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase(),
  )
  return (
    <>
      <p>Now I'm going to show you the {isTouch ? 'gesture' : 'keyboard shortcut'} to view multiple contexts.</p>
      <p>First select "{caseSensitiveValue}".</p>
    </>
  )
}

export default Tutorial2StepContextViewSelect
