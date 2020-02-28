import React, { Fragment } from 'react'
import { isMobile } from '../../browser'
import { headValue } from '../../util'
import { GestureDiagram } from '../GestureDiagram'
import {
  shortcutById,
} from '../../shortcuts'

const newThoughtShortcut = shortcutById('newThought')

export default TutorialStepSecondThoughtEnter = ({ cursor }) => (<Fragment>
  <p>Good work!</p>
  <p>{isMobile ? <Fragment>Swiping <GestureDiagram path={newThoughtShortcut.gesture} size='28' style={{ margin: '-10px -4px -6px' }} /></Fragment> : 'Hitting Enter'} will always create a new thought <i>after</i> the currently selected thought.</p>
  {!cursor || headValue(cursor).length > 0 ? <p>Wonderful. Click the Next button when you are ready to continue.</p> : <p>Now type some text for the new thought.</p>}
</Fragment>)
