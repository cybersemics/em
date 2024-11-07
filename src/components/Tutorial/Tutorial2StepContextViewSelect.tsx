import { useSelector } from 'react-redux'
import { isTouch } from '../../browser'
import { TUTORIAL_CONTEXT } from '../../constants'
import getContexts from '../../selectors/getContexts'

// eslint-disable-next-line jsdoc/require-jsdoc
const Tutorial2StepContextViewSelect = ({ tutorialChoice }: { tutorialChoice: keyof typeof TUTORIAL_CONTEXT }) => {
  const caseSensitiveValue = useSelector(state =>
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
