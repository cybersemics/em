import { useDispatch } from 'react-redux'
import { tutorialPrevActionCreator as tutorialPrev } from '../../actions/tutorialPrev'
import { TUTORIAL_STEP_START } from '../../constants'
import TutorialNavigationButton from './TutorialNavigationButton'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigationPrev = ({ tutorialStep }: { tutorialStep: number }) => {
  const dispatch = useDispatch()
  return (
    <TutorialNavigationButton
      classes='tutorial-prev'
      disabled={tutorialStep === TUTORIAL_STEP_START}
      clickHandler={() => dispatch(tutorialPrev())}
      value='Prev'
    />
  )
}

export default TutorialNavigationPrev
