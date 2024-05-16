import classNames from 'classnames'
import { useDispatch } from 'react-redux'
import { tutorialActionCreator as tutorial } from '../../actions/tutorial'
import { tutorialChoiceActionCreator as tutorialChoice } from '../../actions/tutorialChoice'
import { tutorialNextActionCreator as tutorialNext } from '../../actions/tutorialNext'
import { tutorialStepActionCreator as setTutorialStep } from '../../actions/tutorialStep'
import {
  TUTORIAL2_STEP_CHOOSE,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_TODO,
} from '../../constants'
import fastClick from '../../util/fastClick'
import TutorialNavigationButton from './TutorialNavigationButton'
import TutorialNavigationNext from './TutorialNavigationNext'
import TutorialNavigationPrev from './TutorialNavigationPrev'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigation = ({ tutorialStep }: { tutorialStep: number }) => {
  const dispatch = useDispatch()
  const tutorialOptions = [
    { key: TUTORIAL_VERSION_TODO, value: TUTORIAL_VERSION_TODO, textValue: 'To-Do List' },
    { key: TUTORIAL_VERSION_JOURNAL, value: TUTORIAL_VERSION_JOURNAL, textValue: 'Journal Theme' },
    { key: TUTORIAL_VERSION_BOOK, value: TUTORIAL_VERSION_BOOK, textValue: 'Book/Podcast Notes' },
  ]
  return (
    <div className='center'>
      <div className='tutorial-step-bullets'>
        {Array(
          tutorialStep < TUTORIAL2_STEP_START
            ? TUTORIAL_STEP_SUCCESS - TUTORIAL_STEP_START + 1
            : TUTORIAL2_STEP_SUCCESS - TUTORIAL2_STEP_START + 1,
        )
          .fill(undefined)
          .map((_, i) => {
            const step = i + (tutorialStep < TUTORIAL2_STEP_START ? 1 : TUTORIAL2_STEP_START)
            return (
              <a
                className={classNames({
                  'tutorial-step-bullet': true,
                  active: step === Math.floor(tutorialStep),
                })}
                key={step}
                {...fastClick(() => dispatch(setTutorialStep({ value: step })))}
              >
                •
              </a>
            )
          })}
      </div>

      {tutorialStep === TUTORIAL_STEP_SUCCESS ? (
        <>
          <TutorialNavigationButton
            clickHandler={() => dispatch(setTutorialStep({ value: TUTORIAL2_STEP_START }))}
            value='Learn more'
          />
          <TutorialNavigationButton clickHandler={() => dispatch(tutorial({ value: false }))} value='Play on my own' />
        </>
      ) : tutorialStep === TUTORIAL2_STEP_CHOOSE ? (
        <ul className='simple-list'>
          {tutorialOptions.map(({ key, value, textValue }) => (
            <li key={key}>
              <TutorialNavigationButton
                clickHandler={() => {
                  dispatch([tutorialChoice({ value }), tutorialNext({})])
                }}
                value={textValue}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <TutorialNavigationPrev tutorialStep={tutorialStep} />
          <TutorialNavigationNext tutorialStep={tutorialStep} />
        </>
      )}
    </div>
  )
}

export default TutorialNavigation
