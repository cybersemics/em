import React, { useRef, useEffect } from 'react'
import { connect, useDispatch } from 'react-redux'
import * as pkg from '../../package.json'
import { TUTORIAL2_STEP_SUCCESS } from '../constants'
import { alert, logout, showModal } from '../action-creators'
import { getSetting, isTutorial } from '../selectors'
import { scaleFontDown, scaleFontUp } from '../action-creators/scaleSize'
import { State } from '../util/initialState'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { authenticated, status, user, fontSize } = state
  return {
    authenticated,
    status,
    isTutorialOn: isTutorial(state),
    tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
    user,
    fontSize,
  }
}

/** A footer component with some useful links. */
const Footer = ({ authenticated, tutorialStep, user, isTutorialOn, status, fontSize }: ReturnType<typeof mapStateToProps>) => {

  const dispatch = useDispatch()

  const firstUpdate = useRef(true)

  useEffect(() => {
    /** Below check is needed to stop alert dispatch when rendered for first time. */
    if (!firstUpdate.current) {
      dispatch(alert(`Font size: ${fontSize}`))

      setTimeout(() => dispatch(alert(null)), 2000)

      window.scrollTo({
        top: document.body.scrollHeight,
        left: 0,
        behavior: 'smooth'
      })
    }
    else {
      firstUpdate.current = false
    }
  }, [fontSize])

  // hide footer during tutorial
  // except for the last step that directs them to the Help link in the footer

  if (isTutorialOn && tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null

  return <ul className='footer list-none'>
    <li>
      <span className='floatLeft'>
        <a className='increase-font expand-click-area-left no-select' onClick={() => dispatch(scaleFontUp())}>A</a>
        <a className='decrease-font expand-click-area-right no-select' onClick={() => dispatch(scaleFontDown())}>A</a>
      </span>
      <a tabIndex={-1} onClick={() => dispatch(showModal({ id: 'feedback' }))} target='_blank' rel='noopener noreferrer'>Feedback</a>
      <span className='footer-divider'> | </span>
      <a tabIndex={-1} onClick={() => dispatch(showModal({ id: 'help' }))}>Help</a>
      {window.firebase ? <span>
        <span className='footer-divider'> | </span>
        {authenticated
          ? <a tabIndex={-1} onClick={() => dispatch(logout())}>Log Out</a>
          : <a tabIndex={-1} onClick={() => dispatch(showModal({ id: 'auth' }))}>Log In</a>
        }
      </span> : null}
    </li><br />

    {user && <>
      <li><span className='dim'>Status: </span><span className={status === 'offline' ? 'dim' : status === 'loaded' ? 'online' : undefined}>{status === 'loaded' ? 'Online' : status[0].toUpperCase() + status.substring(1)}</span></li>
      <li><span className='dim'>Logged in as: </span>{user.email}</li>
      <li><span className='dim'>User ID: </span><span className='mono'>{user.uid.slice(0, 6)}</span></li>
    </>}

    <li><span className='dim'>Version: </span><span>{pkg.version}</span></li>

  </ul>
}

export default connect(mapStateToProps)(Footer)
