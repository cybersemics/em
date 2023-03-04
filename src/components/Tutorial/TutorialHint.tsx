import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import State from '../../@types/State'
import setTutorialStep from '../../action-creators/tutorialStep'
import getSetting from '../../selectors/getSetting'

/** Renders a hint button that will advance the tutorial by a fractional step and show a hint. */
const TutorialHint: FC = ({ children }) => {
  // fractional steps are hints
  const tutorialStep = useSelector((state: State) => +(getSetting(state, 'Tutorial Step') || 0))
  const dispatch = useDispatch()
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
}

export default TutorialHint
