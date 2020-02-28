import React, { Fragment } from 'react'
import { contextOf, headValue, ellipsize } from '../../util'

export const TutorialStepSubThoughtEnter = ({ cursor }) => (<Fragment>
  <p>As you can see, the new thought{cursor && cursor.length > 1 && headValue(cursor).length > 0 ? <Fragment> "{ellipsize(headValue(cursor))}"</Fragment> : null} is nested <i>within</i> {cursor && cursor.length > 1 ? <Fragment>"{ellipsize(headValue(contextOf(cursor)))}"</Fragment> : 'the other thought'}. This is useful for using a thought as a category, for example, but the exact meaning is up to you.</p>
  <p>You can create thoughts within thoughts within thoughts. There is no limit.</p>
  {!cursor || headValue(cursor).length > 0 ? <p>Click the Next button when you are ready to continue.</p> : <p>Feel free to type some text for the new thought.</p>}
</Fragment>)
