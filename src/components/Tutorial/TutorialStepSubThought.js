import React, { Fragment } from 'react'
import { isMac, isMobile } from '../../browser'
import { headValue } from '../../util'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialStepSubThought = ({ cursor }) => <Fragment>
  <p>Now I am going to show you how to add a thought <i>within</i> another thought.</p>
  {cursor && headValue(cursor) === '' ? <p>Hit the Delete key to delete the current blank thought. It's not needed right now.</p> : null}
  {!cursor ? <p>{isMobile ? 'Tap' : 'Click'} a thought to select it.</p> : <p>{isMobile ? 'Trace the line below' : `${cursor && headValue(cursor) === '' ? 'Then h' : 'H'}old the ${isMac ? 'Command' : 'Ctrl'} key and hit the Enter key`}.</p>}
</Fragment>

export default TutorialStepSubThought
