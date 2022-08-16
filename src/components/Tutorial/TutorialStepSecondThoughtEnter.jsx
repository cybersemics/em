import React, { Fragment } from 'react'
import { useStore } from 'react-redux'
import { isTouch } from '../../browser'
import { shortcutById } from '../../shortcuts'
import headValue from '../../util/headValue'
import GestureDiagram from '../GestureDiagram'

const newThoughtShortcut = shortcutById('newThought')

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSecondThoughtEnter = ({ cursor }) => {
  const state = useStore().getState()

  const headCursorValue = cursor && headValue(state, cursor)

  return (
    <Fragment>
      <p>Good work!</p>
      <p>
        {isTouch ? (
          <Fragment>
            Swiping <GestureDiagram path={newThoughtShortcut.gesture} size='28' style={{ margin: '-10px -4px -6px' }} />
          </Fragment>
        ) : (
          'Hitting Enter'
        )}{' '}
        will always create a new thought <i>after</i> the currently selected thought.
      </p>
      {!cursor || headCursorValue?.length > 0 ? (
        <p>Wonderful. Click the Next button when you are ready to continue.</p>
      ) : (
        <p>Now type some text for the new thought.</p>
      )}
    </Fragment>
  )
}

export default TutorialStepSecondThoughtEnter
