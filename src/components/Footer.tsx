import React, { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import * as pkg from '../../package.json'
import alert from '../action-creators/alert'
import logout from '../action-creators/logout'
import { scaleFontDown, scaleFontUp } from '../action-creators/scaleSize'
import showModal from '../action-creators/showModal'
import { TUTORIAL2_STEP_SUCCESS } from '../constants'
import scrollTo from '../device/scrollTo'
import { useFooterUseSelectors } from '../hooks/Footer.useSelectors'

/** A footer component with some useful links. */
const Footer = () => {
  const dispatch = useDispatch()
  const { authenticated, user, status, tutorialStep, isPushing, isTutorialOn, isPushQueueEmpty, fontSize } =
    useFooterUseSelectors()

  const firstUpdate = useRef(true)

  // alert when font size changes
  useEffect(() => {
    // prevent alert dispatch when rendered for first time
    if (!firstUpdate.current) {
      dispatch(alert(`Font size: ${fontSize}`, { clearDelay: 2000 }))
      scrollTo('bottom')
    } else {
      firstUpdate.current = false
    }
  }, [fontSize])

  // hide footer during tutorial
  // except for the last step that directs them to the Help link in the footer

  if (isTutorialOn && tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null

  return (
    <ul className='footer list-none'>
      <li>
        <span className='floatLeft'>
          <a className='increase-font expand-click-area-left no-select' onClick={() => dispatch(scaleFontUp())}>
            A
          </a>
          <a className='decrease-font expand-click-area-right no-select' onClick={() => dispatch(scaleFontDown())}>
            A
          </a>
        </span>
        <a
          tabIndex={-1}
          onClick={() => dispatch(showModal({ id: 'feedback' }))}
          target='_blank'
          rel='noopener noreferrer'
        >
          Feedback
        </a>
        <span className='footer-divider'> | </span>
        <a tabIndex={-1} onClick={() => dispatch(showModal({ id: 'help' }))}>
          Help
        </a>
        {window.firebase ? (
          <span>
            <span className='footer-divider'> | </span>
            {authenticated ? (
              <a tabIndex={-1} onClick={() => dispatch(logout())}>
                Log Out
              </a>
            ) : (
              <a tabIndex={-1} onClick={() => dispatch(showModal({ id: 'auth' }))}>
                Log In
              </a>
            )}
          </span>
        ) : null}
      </li>
      <br />

      {user && (
        <>
          <li>
            <span className='dim'>Status: </span>
            <span
              className={
                status === 'offline'
                  ? 'dim'
                  : !isPushQueueEmpty && !isPushing
                  ? 'error'
                  : status === 'loaded'
                  ? 'online'
                  : undefined
              }
            >
              {
                // pushQueue will be empty after all updates have been flushed to Firebase.
                // isPushing is set back to true only when all updates have been committed.
                // This survives disconnections as long as the app isn't restarted and the push Promise does not time out. In that case, Firebase will still finish pushing once it is back online, but isPushing will be false. There is no way to independently check the completion status of Firebase offline writes (See: https://stackoverflow.com/questions/48565115/how-to-know-my-all-local-writeoffline-write-synced-to-firebase-real-time-datab#comment84128318_48565275).
                (!isPushQueueEmpty || isPushing) && (status === 'loading' || status === 'loaded')
                  ? 'Saving'
                  : status === 'loaded'
                  ? 'Online'
                  : status[0].toUpperCase() + status.substring(1)
              }
            </span>
          </li>
          <li>
            <span className='dim'>Logged in as: </span>
            {user.email}
          </li>
          <li>
            <span className='dim'>User ID: </span>
            <span className='mono'>{user.uid.slice(0, 6)}</span>
          </li>
        </>
      )}

      <li>
        <span className='dim'>Version: </span>
        <span>{pkg.version}</span>
      </li>
    </ul>
  )
}

export default Footer
