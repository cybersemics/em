import React from 'react'
import classNames from 'classnames'
import { tutorial, tutorialChoice, tutorialNext, tutorialStep as setTutorialStep } from '../../action-creators'

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

import TutorialNavigationPrev from './TutorialNavigationPrev'
import TutorialNavigationNext from './TutorialNavigationNext'
import TutorialNavigationButton from './TutorialNavigationButton'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigation = ({ tutorialStep, dispatch }) => {
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
          .fill()
          .map((_, i) => {
            const step = i + (tutorialStep < TUTORIAL2_STEP_START ? 1 : TUTORIAL2_STEP_START)
            return (
              <a
                className={classNames({
                  'tutorial-step-bullet': true,
                  active: step === Math.floor(tutorialStep),
                })}
                key={step}
                onClick={() => dispatch(setTutorialStep({ value: step }))}
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
