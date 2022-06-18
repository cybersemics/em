import React from 'react'
import { connect } from 'react-redux'
import setTutorialStep from '../../action-creators/tutorialStep'
import getSetting from '../../selectors/getSetting'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = state => ({
  tutorialStep: +getSetting(state, 'Tutorial Step'),
})

/** Renders a hint button that will advance the tutorial by a fractional step and show a hint. */
const TutorialHint = connect(mapStateToProps)(({ tutorialStep, children, dispatch }) => {
  // fractional steps are hints
  const hint = tutorialStep !== Math.floor(tutorialStep)

  return (
    <>
      {!hint ? (
        <a
          className='button button-variable-width button-status button-less-padding text-small button-dim'
          onClick={() => dispatch(setTutorialStep({ value: tutorialStep + 0.1 }))}
        >
          hint
        </a>
      ) : (
        children
      )}
    </>
  )
})

export default TutorialHint
