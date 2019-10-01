import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// constants
import {
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_ENTERTHOUGHT,
  TUTORIAL_STEP_NEWTHOUGHTINCONTEXT,
  TUTORIAL_STEP_END,
} from '../constants.js'

export const Tutorial = connect(({ cursor, settings: { tutorialStep } = {} }) => ({ cursor, tutorialStep }))(({ cursor, tutorialStep, dispatch }) =>
  tutorialStep < TUTORIAL_STEP_END ? <div className='tutorial'>
    <a className='tutorial-skip text-small' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_END })}>✕ skip tutorial</a>
    <div className='clear'>
      {{

        [TUTORIAL_STEP_START]: <React.Fragment>
          <p>Welcome to your personal thoughtspace. Everything you write here will be stored privately on this device, protected by your device password.</p>
          <p>Don't worry. I will walk you through everything you need to know. Let's begin...</p>
        </React.Fragment>,

        [TUTORIAL_STEP_FIRSTTHOUGHT]: <React.Fragment>
          <p>First, let me show you how to create a new thought in <b>em</b> using a swipe gesture.</p>
          <p>Trace the line below with your finger to create a new thought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_ENTERTHOUGHT]: <React.Fragment>
          <p>You did it! Now enter a thought. Anything will do.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_NEWTHOUGHTINCONTEXT]: <React.Fragment>
          <p>Now I am going to show you how to add a subthought.</p>
          <p>A subthought is connected to a thought and is shown as a nested bullet.</p>
          <p>Trace the line below to create a new subthought.</p>
        </React.Fragment>,

      }[tutorialStep] || <p>Oops! I am supposed to continue the tutorial, but I do not recognize the tutorial step we are on.</p>}
      <div className='center'>

        <div className='tutorial-step-bullets'>{Array(TUTORIAL_STEP_END).fill().map((_, i) =>
          <a
            className={classNames({
              'tutorial-step-bullet': true,
              active: i === tutorialStep
            })}
            key={i}
            onClick={() => dispatch({ type: 'tutorialStep', value: i })}>•</a>
        )}</div>
        <a className={classNames({
          'tutorial-prev': true,
          button: true,
          'button-variable-width': true
        })} disabled={tutorialStep === TUTORIAL_STEP_START} onClick={() => dispatch({ type: 'tutorialStep', value: tutorialStep - 1 }) }>Prev</a>
        {tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ? <span className='tutorial-next-wait text-small'>Complete the instructions to continue</span>
          : <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorialStep', value: tutorialStep + 1 }) }>{tutorialStep === TUTORIAL_STEP_END - 1 ? 'Finish' : 'Next'}</a>}
      </div>
    </div>
  </div> : null
)

