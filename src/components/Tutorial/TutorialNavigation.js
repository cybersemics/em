import React from 'react'
import classNames from 'classnames'

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

import {
  tutorialNext,
} from '../../action-creators/tutorial'

import TutorialNavigationButton from './TutorialNavigationButton'

const TutorialNavigation = ({ tutorialStep, dispatch }) => {
  const tutorialOptions = [
    { key: TUTORIAL_VERSION_TODO, value: TUTORIAL_VERSION_TODO, textValue: 'To-Do List' },
    { key: TUTORIAL_VERSION_JOURNAL, value: TUTORIAL_VERSION_JOURNAL, textValue: 'Journal Theme' },
    { key: TUTORIAL_VERSION_BOOK, value: TUTORIAL_VERSION_BOOK, textValue: 'Book/Podcast Notes' },
  ]
  return (
    <div className='center'>
      <div className='tutorial-step-bullets'>{Array(tutorialStep < TUTORIAL2_STEP_START
        ? TUTORIAL_STEP_SUCCESS - TUTORIAL_STEP_START + 1
        : TUTORIAL2_STEP_SUCCESS - TUTORIAL2_STEP_START + 1
      ).fill().map((_, i) => {
        const step = i + (tutorialStep < TUTORIAL2_STEP_START ? 1 : TUTORIAL2_STEP_START)
        return <a
          className={classNames({
            'tutorial-step-bullet': true,
            active: step === Math.floor(tutorialStep)
          })}
          key={step}
          onClick={() => dispatch({ type: 'tutorialStep', value: step })}>•</a>
      }
      )}</div>

      {tutorialStep === TUTORIAL_STEP_SUCCESS
        ? <React.Fragment>
          <TutorialNavigationButton clickHandler={() => dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_START })} value="Learn more" />
          <TutorialNavigationButton clickHandler={() => dispatch({ type: 'tutorial', value: false })} value="Play on my own" />
        </React.Fragment>
        : tutorialStep === TUTORIAL2_STEP_CHOOSE
          ? <ul className='simple-list'>
            {tutorialOptions.map(({ key, value, textValue }) => (
              <li key={key}>
                <TutorialNavigationButton clickHandler={() => {
                  dispatch({ type: 'tutorialChoice', value })
                  tutorialNext()
                }} value={textValue} />
              </li>
            ))}
          </ul>
          : <React.Fragment>
            <TutorialNavigationPrev tutorialStep={tutorialStep} />
            <TutorialNavigationNext tutorialStep={tutorialStep} />
          </React.Fragment>
      }
    </div>)
}

export default TutorialNavigation
