import { Ref } from 'react'
import { useDispatch } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { tutorialBullet } from '../../../styled-system/recipes'
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

/**
 * TutorialNavigation component for navigating through the tutorial steps.
 */
const TutorialNavigation = ({
  tutorialStep,
  nextRef,
}: {
  /** The current step in the tutorial. */
  tutorialStep: number
  /** A reference passed to the "next" navigation button. */
  nextRef: Ref<HTMLAnchorElement>
}) => {
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
                className={css({
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '32px',
                  marginLeft: '1px',
                  marginRight: '1px',
                  transition: 'all 400ms ease-in-out',
                  opacity: step === Math.floor(tutorialStep) ? 1 : 0.25,
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
        <ul>
          {tutorialOptions.map(({ key, value, textValue }) => (
            <li
              className={cx(
                tutorialBullet(),
                css({
                  listStyle: 'none',
                  width: '240px',
                  margin: '0 auto 0.5em',
                }),
              )}
              key={key}
            >
              <TutorialNavigationButton
                clickHandler={() => {
                  dispatch([tutorialChoice({ value }), tutorialNext({})])
                }}
                value={textValue}
                classes={css({ display: 'block' })}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <TutorialNavigationPrev tutorialStep={tutorialStep} />
          <TutorialNavigationNext tutorialStep={tutorialStep} ref={nextRef} />
        </>
      )}
    </div>
  )
}

export default TutorialNavigation
