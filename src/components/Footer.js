import React from 'react'
import { connect } from 'react-redux'
import * as pkg from '../../package.json'

// constants
import {
  TUTORIAL2_STEP_SUCCESS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SCALE_INCREMENT
} from '../constants.js'

// util
import {
  cursorBack,
  isTutorial,
  login,
  logout,
} from '../util.js'

export const Footer = connect(({ authenticated, status, settings, user, scaleSize }) => ({ authenticated, status, settings, user, scaleSize }))(({ authenticated, status, settings, user, scaleSize, dispatch }) => {

  // hide footer during tutorial
  // except for the last step that directs them to the Help link in the footer
  if (isTutorial() && settings.tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null

  return <ul className='footer list-none' onClick={() => {
    // remove the cursor when the footer is clicked (the other main area besides .content)
    cursorBack()
  }}>
    <li>
      <span className="floatLeft">
        <a className='increaseFont' onClick={() => {
          if (scaleSize < MAX_FONT_SIZE) dispatch({ type: 'scaleSize', value: scaleSize + FONT_SCALE_INCREMENT })
        }}>A</a>
        <span>  </span>
        <a onClick={() => {
          if (scaleSize > (MIN_FONT_SIZE + FONT_SCALE_INCREMENT)) dispatch({ type: 'scaleSize', value: scaleSize - FONT_SCALE_INCREMENT })
        }}>A</a>
      </span>
      <a tabIndex='-1' href='https://forms.gle/ooLVTDNCSwmtdvfA8' target='_blank' rel='noopener noreferrer'>Feedback</a>
      <span> | </span>
      <a tabIndex='-1' onClick={() => {
        window.scrollTo(0, 0)
        dispatch({ type: 'showModal', id: 'help' })
      }}>Help</a>
      {window.firebase ? <span>
        <span> | </span>
        {authenticated
          ? <a tabIndex='-1' onClick={logout}>Log Out</a>
          : <a tabIndex='-1' onClick={login}>Log In</a>
        }
      </span> : null}
    </li><br/>
    {user ? <li><span className='dim'>Logged in as: </span>{user.email}</li> : null}
    {user ? <li><span className='dim'>User ID: </span><span className='mono'>{user.uid.slice(0, 6)}</span></li> : null}
    <li><span className='dim'>Version: </span>{pkg.brandVersion}.{pkg.version.split('.')[0]}</li>
  </ul>
})
