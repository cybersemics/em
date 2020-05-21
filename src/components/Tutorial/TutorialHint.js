import React from 'react'
import { connect } from 'react-redux'

import { getSetting } from '../../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = state => ({
  tutorialStep: +getSetting(state, 'Tutorial Step')
})

/** Renders a hint button that will advance the tutorial by a fractional step and show a hint. */
const TutorialHint = connect(mapStateToProps)(({ tutorialStep, children, dispatch }) => {

  // fractional steps are hints
  const hint = tutorialStep !== Math.floor(tutorialStep)

  return <React.Fragment>
    {!hint
      ? <a className='button button-variable-width button-status button-less-padding text-small button-dim' onClick={() => dispatch({ type: 'tutorialStep', value: tutorialStep + 0.1 })}>hint</a>
      : children
    }
  </React.Fragment>
})

export default TutorialHint
