import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import pkg from '../../package.json'
import Modal from '../@types/Modal'
import { alertActionCreator as alert } from '../actions/alert'
import { scaleFontDown, scaleFontUp } from '../actions/scaleSize'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { TUTORIAL2_STEP_SUCCESS } from '../constants'
import { tsid } from '../data-providers/yjs'
import scrollTo from '../device/scrollTo'
import { useFooterUseSelectors } from '../hooks/Footer.useSelectors'
import themeColors from '../selectors/themeColors'
import offlineStatusStore from '../stores/offlineStatusStore'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'

/** Show the user's connection status. */
const Status = () => {
  const colors = useSelector(themeColors)
  const replicationPercentage = syncStatusStore.useSelector(({ replicationProgress }) =>
    replicationProgress !== null ? Math.floor(replicationProgress * 100) : null,
  )
  // shows import progress or saving progress
  const savingPercentage = syncStatusStore.useSelector(({ importProgress, savingProgress }) =>
    Math.floor((importProgress < 1 ? importProgress : savingProgress) * 100),
  )
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
      {savingPercentage < 100
        ? `Saving ${savingPercentage}%`
        : status === 'preconnecting'
          ? 'Initializing'
          : status === 'connecting' || status === 'reconnecting'
            ? 'Connecting'
            : status === 'connected' || status === 'synced'
              ? !replicationPercentage || replicationPercentage < 100
                ? `Replicating ${replicationPercentage ? replicationPercentage + '%' : '...'}`
                : 'Online'
              : status === 'offline'
                ? 'Offline'
                : null}
    </span>
  )
}

/** A pipe delimiter for a horizontal list of links. */
const LinkDivider = () => <span className='footer-divider'> | </span>

/** A link that opens a modal. */
const ModalLink = ({ id, children }: { id: Modal; children: React.ReactNode }) => {
  const dispatch = useDispatch()
  return (
    <a
      tabIndex={-1}
      {...fastClick(() => dispatch(showModal({ id })))}
      className='extend-tap'
      style={{
        whiteSpace: 'nowrap',
      }}
    >
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
  }, [dispatch, fontSize])

  // hide footer during tutorial
  // except for the last step that directs them to the Help link in the footer

  if (isTutorialOn && tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null

  return (
    <ul aria-label='footer' className='footer list-none'>
      <li>
        <div style={{ float: 'left', lineHeight: 1 }}>
          <a className='increase-font expand-click-area-left no-select' {...fastClick(() => dispatch(scaleFontUp()))}>
            A
          </a>
          <a
            className='decrease-font expand-click-area-right no-select'
            {...fastClick(() => dispatch(scaleFontDown()))}
          >
            A
          </a>
        </div>

        <div style={{ lineHeight: 2, margin: '-0.5em 0' }}>
          <ModalLink id='devices'>Devices</ModalLink>
          <LinkDivider />
          <ModalLink id='settings'>Settings</ModalLink>
          <LinkDivider />
          <ModalLink id='help'>Help</ModalLink>
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
