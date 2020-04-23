import React from 'react'
import { connect } from 'react-redux'
import * as pkg from '../../package.json'
import { scaleFontDown, scaleFontUp } from '../action-creators/scaleSize'

// constants
import {
  TUTORIAL2_STEP_SUCCESS,
} from '../constants'

// util
import {
  getSetting,
  isTutorial,
  login,
  logout,
} from '../util'

const mapStateToProps = ({ authenticated, status, user }) => ({
  authenticated,
  status,
  isTutorialOn: isTutorial(),
  tutorialStep: +getSetting('Tutorial Step') || 1,
  user,
})

const Footer = ({ authenticated, tutorialStep, user, dispatch, isTutorialOn }) => {

  // hide footer during tutorial
  // except for the last step that directs them to the Help link in the footer

  if (isTutorialOn && tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null

  return <ul className='footer list-none'>
    <li>
      <span className="floatLeft">
        <a className='increase-font expand-click-area-left' style={{
        }} onClick={scaleFontUp}>A</a>
        <span>  </span>
        <a className='decrease-font expand-click-area-right' onClick={scaleFontDown}>A</a>
      </span>
      <a tabIndex='-1' href='https://forms.gle/ooLVTDNCSwmtdvfA8' target='_blank' rel='noopener noreferrer'>Feedback</a>
      <span className='footer-divider'> | </span>
      <a tabIndex='-1' onClick={e => {
        window.scrollTo(0, 0)
        dispatch({ type: 'showModal', id: 'help' })
      }}>Help</a>
      {window.firebase ? <span>
        <span className='footer-divider'> | </span>
        {authenticated
          ? <a tabIndex='-1' onClick={logout}>Log Out</a>
          : <a tabIndex='-1' onClick={login}>Log In</a>
        }
      </span> : null}
    </li><br />
    {user ? <li><span className='dim'>Logged in as: </span>{user.email}</li> : null}
    {user ? <li><span className='dim'>User ID: </span><span className='mono'>{user.uid.slice(0, 6)}</span></li> : null}
    <li><span className='dim'>Version: </span><span>{pkg.version}</span></li>
  </ul>
}

export default connect(mapStateToProps)(Footer)
