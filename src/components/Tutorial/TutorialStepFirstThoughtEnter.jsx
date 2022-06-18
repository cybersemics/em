import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import { isTouch } from '../../browser'
import headValue from '../../util/headValue'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepFirstThoughtEnter = ({ cursor }) => {
  const store = useStore()

  return (
    <Fragment>
      <p>You did it!</p>
      {!cursor || headValue(store.getState(), cursor).length > 0 ? (
        <p>{isTouch ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p>
      ) : (
        <p>Now type something. Anything will do.</p>
      )}
    </Fragment>
  )
}

export default TutorialStepFirstThoughtEnter
