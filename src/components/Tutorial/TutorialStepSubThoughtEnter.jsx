import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import { isTouch } from '../../browser'
import ellipsize from '../../util/ellipsize'
import headValue from '../../util/headValue'
import parentOf from '../../util/parentOf'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSubThoughtEnter = ({ cursor }) => {
  const store = useStore()

  return (
    <Fragment>
      <p>
        As you can see{isTouch ? ' (if you scroll down)' : ''}, the new thought
        {cursor && cursor.length > 1 && headValue(store.getState(), cursor).length > 0 ? (
          <Fragment> "{ellipsize(headValue(store.getState(), cursor))}"</Fragment>
        ) : null}{' '}
        is nested <i>within</i>{' '}
        {cursor && cursor.length > 1 ? (
          <Fragment>"{ellipsize(headValue(store.getState(), parentOf(cursor)))}"</Fragment>
        ) : (
          'the other thought'
        )}
        . This is useful for using a thought as a category, for example, but the exact meaning is up to you.
      </p>
      <p>You can create thoughts within thoughts within thoughts. There is no limit.</p>
      {!cursor || headValue(store.getState(), cursor).length > 0 ? (
        <p>Click the Next button when you are ready to continue.</p>
      ) : (
        <p>Feel free to type some text for the new thought.</p>
      )}
    </Fragment>
  )
}

export default TutorialStepSubThoughtEnter
