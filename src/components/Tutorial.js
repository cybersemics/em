import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_ENTERTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT_ENTER,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL_STEP_END,
} from '../constants.js'

import {
  tutorialNext,
  tutorialPrev,
} from '../action-creators/tutorial.js'

import {
  getChildrenWithRank,
  encodeItems,
  sigKey,
  unrank,
} from '../util.js'

// components
import { GestureDiagram } from './GestureDiagram.js'

const TutorialStepSecondThought = connect()(({ hint, dispatch }) =>
  <React.Fragment>
    <p>Well done!</p>
    <p>Do you remember the gesture? Try adding another thought.
    {!hint
      ? <a className='button button-variable-width button-status button-less-padding text-small button-dim' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_SECONDTHOUGHT_HINT })}>hint</a>
      : null
    }</p>
    {hint
      ? <p>Trace the line below with your finger to create a new thought.</p>
      : null
    }
  </React.Fragment>
)

export const Tutorial = connect(({ contextChildren, cursor, data, settings: { tutorialStep } = {} }) => ({ contextChildren, cursor, data, tutorialStep }))(({ contextChildren, cursor, data, tutorialStep, dispatch }) => {

  if (tutorialStep === TUTORIAL_STEP_END) return null

  const rootChildren = contextChildren[encodeItems([ROOT_TOKEN])] || []

  // sibling of the cursor
  const sibling = () => cursor
    ? rootChildren.find(child => unrank(cursor).indexOf(child.key) === -1)
    : rootChildren[0]

  // sibling with children
  const siblingWithChildren = () => cursor
    ? rootChildren.find(child =>
      unrank(cursor).indexOf(child.key) === -1 &&
      getChildrenWithRank([child]).length > 0
    )
    : null

  // child of sibling with children
  const niece = () => {
    const other = cursor
      ? rootChildren.find(child =>
        unrank(cursor).indexOf(child.key) === -1 &&
        getChildrenWithRank([child]).length > 0
      )
      : null

    return other ? getChildrenWithRank([other])[0].key : null
  }

  return <div className='tutorial'>
    <a className='upper-right tutorial-skip text-small' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_END })}>✕ skip tutorial</a>
    <div className='clear'>
      {{

        [TUTORIAL_STEP_START]: <React.Fragment>
          <p>Welcome to your personal thoughtspace. Everything you write here will be stored privately on this device, protected by your device password.</p>
          <p>Don't worry. I will walk you through everything you need to know. Let's begin...</p>
        </React.Fragment>,

        [TUTORIAL_STEP_FIRSTTHOUGHT]: <React.Fragment>
          <p>First, let me show you how to create a new thought in <b>em</b> using a gesture.</p>
          <p>Trace the line below with your finger to create a new thought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_ENTERTHOUGHT]: <React.Fragment>
          <p>You did it! Now enter a thought. Anything will do.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SECONDTHOUGHT]: <TutorialStepSecondThought />,
        [TUTORIAL_STEP_SECONDTHOUGHT_HINT]: <TutorialStepSecondThought hint={true} />,

        [TUTORIAL_STEP_SECONDTHOUGHT_ENTER]: <React.Fragment>
          <p>Good work! Now enter some text for the new thought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SUBTHOUGHT]: <React.Fragment>
          <p>Now I am going to show you how to add a subthought.</p>
          <p>Trace the line below to create a new subthought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SUBTHOUGHT_ENTER]: <React.Fragment>
          <p>Well done!</p>
          <p>As you can see, a subthought is nested <i>below</i> the current thought.</p>
          <p>Feel free to enter some text for the new subthought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_AUTOEXPAND]: <React.Fragment>
          <p>Subthoughts are automatically hidden when you move the cursor away from a thought. {sibling() ? <span>Try tapping on "{sibling().key}".</span> : null}</p>
          {cursor ? <p>(The cursor is the darker circle next to "{sigKey(cursor)}").</p> : null}
        </React.Fragment>,

        [TUTORIAL_STEP_AUTOEXPAND_EXPAND]: <React.Fragment>
          {niece() ? <p>Notice that "{niece()}" is hidden now. This is the autofocus feature. It helps you stay focused on your current thoughts.</p> : ''}
          <p>Tap on {siblingWithChildren() ? `"${siblingWithChildren().key}"` : 'a thought'} to show {niece() ? `"${niece()}"` : 'its subthought'} again.</p>
        </React.Fragment>,

        // [TUTORIAL_STEP_DONE]: <React.Fragment>
        //   <p></p>
        // </React.Fragment>,

        [TUTORIAL_STEP_SUCCESS]: <React.Fragment>
          <p>Congratulations! You have completed the tutorial!</p>
          <p>Now that you know how to create a thought, create a subthought, and show and hide subthoughts by moving the cursor, you have everything you need to organize your thoughts with <b>em</b>.</p>
          <p>Happy sensemaking!</p>
        </React.Fragment>,

      }[tutorialStep] || <p>Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.</p>}
      <div className='center'>

        <div className='tutorial-step-bullets'>{Array(TUTORIAL_STEP_END).fill().map((_, i) =>
          <a
            className={classNames({
              'tutorial-step-bullet': true,
              active: i === Math.floor(tutorialStep)
            })}
            key={i}
            onClick={() => dispatch({ type: 'tutorialStep', value: i })}>•</a>
        )}</div>
        <a className={classNames({
          'tutorial-prev': true,
          button: true,
          'button-variable-width': true
        })} disabled={tutorialStep === TUTORIAL_STEP_START} onClick={() => tutorialPrev(tutorialStep) }>Prev</a>
        {Math.floor(tutorialStep) !== TUTORIAL_STEP_START &&
          // always display 'Finish' on the last step
          // easier than updating the enum value each time
          Math.floor(tutorialStep) !== TUTORIAL_STEP_END - 1
          ? <span className='tutorial-next-wait text-small'>Complete the instructions to continue</span>
          : <a className='tutorial-button button button-variable-width' onClick={() => tutorialNext(tutorialStep) }>{tutorialStep === TUTORIAL_STEP_END - 1 ? 'Finish' : 'Next'}</a>}
      </div>
    </div>

    {tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT || tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
      tutorialStep === TUTORIAL_STEP_SUBTHOUGHT
      ? <div className='tutorial-trace-gesture'>
        <GestureDiagram path={
          tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT || tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ? 'rd'
          : tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ? 'rdr'
            : '?'
          }
          size='160'
          strokeWidth='10'
          arrowSize='5'
          className='animate-pulse'
        />
      </div>
      : null
    }

  </div>
})

