import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT } from '../../constants'
import getContextCount from '../../selectors/getContextCount'
import selectTutorialChoice from '../../selectors/selectTutorialChoice'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewSelect = () => {
  const tutorialChoice = useSelector(selectTutorialChoice)
  const caseSensitiveValue = useSelector(state =>
    getContextCount(state, TUTORIAL_CONTEXT[tutorialChoice]) > 0
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
