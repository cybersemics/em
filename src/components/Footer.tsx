import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as pkg from '../../package.json'
import Modal from '../@types/Modal'
import State from '../@types/State'
import alert from '../action-creators/alert'
import { scaleFontDown, scaleFontUp } from '../action-creators/scaleSize'
import showModal from '../action-creators/showModal'
import { TUTORIAL2_STEP_SUCCESS } from '../constants'
import { tsid } from '../data-providers/yjs'
import scrollTo from '../device/scrollTo'
import { useFooterUseSelectors } from '../hooks/Footer.useSelectors'
import themeColors from '../selectors/themeColors'
import offlineStatusStore from '../stores/offlineStatusStore'
import pushStore from '../stores/push'

/** Show the user's connection status. */
const Status = () => {
  const isQueued = useSelector((state: State) => state.pushQueue.length > 0)
  const colors = useSelector(themeColors)
  const isPushing = pushStore.useSelector(({ isPushing }) => isPushing)
  const status = offlineStatusStore.useState()
  return (
    <span
      style={{
        color:
          status === 'preconnecting' || status === 'offline'
            ? colors.gray50
            : status === 'connecting' || status === 'reconnecting'
            ? colors.yellow
            : status === 'connected' || status === 'synced'
            ? colors.lightgreen
            : (new Error('test'), undefined),
      }}
    >
      {
        // pushQueue will be empty after all updates have been flushed to the remote.
        // isPushing is set back to true only when all updates have been committed.
        // This survives disconnections as long as the app isn't restarted and the push Promise does not time out. In that case, Firebase will still finish pushing once it is back online, but isPushing will be false. There is no way to independently check the completion status of Firebase offline writes (See: https://stackoverflow.com/questions/48565115/how-to-know-my-all-local-writeoffline-write-synced-to-firebase-real-time-datab#comment84128318_48565275).
        isPushing || isQueued
          ? 'Saving'
          : status === 'preconnecting'
          ? 'Initializing'
          : status === 'connecting' || status === 'reconnecting'
          ? 'Connecting'
          : status === 'connected' || status === 'synced'
          ? 'Online'
          : status === 'offline'
          ? 'Offline'
          : null
      }
    </span>
  )
}

/** A pipe delimiter for a horizontal list of links. */
const LinkDivider = () => <span className='footer-divider'> | </span>

/** A link that opens a modal. */
const ModalLink = ({ id, children }: { id: Modal; children: React.ReactNode }) => {
  const dispatch = useDispatch()
  return (
    <a tabIndex={-1} onClick={() => dispatch(showModal({ id }))} style={{ whiteSpace: 'nowrap' }}>
      {children}
    </a>
  )
}

/** A footer component with some useful links. */
const Footer = () => {
  const dispatch = useDispatch()
  const { tutorialStep, isTutorialOn, fontSize } = useFooterUseSelectors()

  // useWhyDidYouUpdate('<Footer>', {
  //   authenticated,
  //   user,
  //   tutorialStep,
  //   isTutorialOn,
  //   fontSize,
  // })

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
    <ul aria-label='footer' className='footer list-none'>
      <li>
        <div style={{ float: 'left', lineHeight: 1 }}>
          <a className='increase-font expand-click-area-left no-select' onClick={() => dispatch(scaleFontUp())}>
            A
          </a>
          <a className='decrease-font expand-click-area-right no-select' onClick={() => dispatch(scaleFontDown())}>
            A
          </a>
        </div>

        <div style={{ lineHeight: 2, margin: '-0.5em 0' }}>
          <ModalLink id='devices'>Devices</ModalLink>
          <LinkDivider />
          <ModalLink id='settings'>Settings</ModalLink>
          <LinkDivider />
          <ModalLink id='manual'>The Manual</ModalLink>
        </div>
      </li>
      <br />

      <li>
        <span className='dim'>Status: </span>
        <Status />
      </li>
      <li>
        <span className='dim'>TSID: </span>
        <span style={{ fontStyle: 'monospace' }}>{tsid}</span>
      </li>

      <li>
        <span className='dim'>App Version: </span>
        {pkg.version}
      </li>
    </ul>
  )
}

export default Footer
