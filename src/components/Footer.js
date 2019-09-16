import React from 'react'
import { connect } from 'react-redux'
import * as pkg from '../../package.json'
import { isMobile } from '../browser.js'

// constants
import {
  TUTORIAL_STEP3_DELETE,
} from '../constants.js'

// util
import {
  cursorBack,
  login,
  logout,
} from '../util.js'

export const Footer = connect(({ status, settings, user }) => ({ status, settings, user }))(({ status, settings, user, dispatch }) => {

  // hide footer during tutorial
  if (settings.tutorialStep < TUTORIAL_STEP3_DELETE) return null

  return <ul className='footer list-none' onClick={() => {
    // remove the cursor when the footer is clicked (the other main area besides .content)
    cursorBack()
  }}>
    <li>
      <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ className='settings-dark' onClick={() => dispatch({ type: 'settings', key: 'dark', value: !settings.dark })}>Dark Mode</a>
      <span> | </span>
      <a tabIndex='-1' href='https://forms.gle/ooLVTDNCSwmtdvfA8' target='_blank' rel='noopener noreferrer'>Feedback <img src={`https://img.icons8.com/small/16/${settings.dark ? '87ceeb' : '1b6f9a'}/open-in-popup.png`} alt='' style={{ verticalAlign: 'middle' }}/></a>
      <span> | </span>
      <a tabIndex='-1' onClick={() => {
        window.scrollTo(0, 0)
        dispatch({ type: 'showHelper', id: 'shortcuts' })
      }}>{isMobile ? 'Gestures' : 'Shortcuts'}</a>
      {window.firebase ? <span>
        <span> | </span>
        {status === 'offline' || status === 'disconnected' || status === 'connected' ? <a tabIndex='-1' className='settings-logout' onClick={login}>Log In</a>
        : <a tabIndex='-1' className='settings-logout' onClick={logout}>Log Out</a>
        }
      </span> : null}
    </li><br/>
    {user ? <li><span className='dim'>Logged in as: </span>{user.email}</li> : null}
    {user ? <li><span className='dim'>User ID: </span><span className='mono'>{user.uid.slice(0, 6)}</span></li> : null}
    <li><span className='dim'>Version: </span>{pkg.version.split('.')[0]}</li>
  </ul>
})

