import React from 'react'
import { connect } from 'react-redux'

/** Renders a hint button that will advance the tutorial by a fractional step and show a hint. */
export const TutorialHint = connect(({ settings: { tutorialStep } }) => ({ tutorialStep }))(({ tutorialStep, children, dispatch }) => {

  // fractional steps are hints
  const hint = tutorialStep !== Math.floor(tutorialStep)

  return <React.Fragment>
    {!hint
      ? <a className='button button-variable-width button-status button-less-padding text-small button-dim' onClick={() => dispatch({ type: 'tutorialStep', value: tutorialStep + 0.1 })}>hint</a>
      : children
    }
  </React.Fragment>
})