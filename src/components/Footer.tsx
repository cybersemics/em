/* eslint-disable react-hooks/rules-of-hooks */
import React, { FC, PropsWithChildren, useEffect, useRef } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import pkg from '../../package.json'
import { css, cx } from '../../styled-system/css'
import { extendTap } from '../../styled-system/recipes'
import Modal from '../@types/Modal'
import { alertActionCreator as alert } from '../actions/alert'
import fontSizeDown from '../actions/fontSizeDown'
import fontSizeUp from '../actions/fontSizeUp'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { TUTORIAL2_STEP_SUCCESS } from '../constants'
import { tsid } from '../data-providers/yjs'
import scrollTo from '../device/scrollTo'
import getSetting from '../selectors/getSetting'
import isTutorial from '../selectors/isTutorial'
import offlineStatusStore from '../stores/offlineStatusStore'
import syncStatusStore from '../stores/syncStatus'
import fastClick from '../util/fastClick'

/** Helper hook that allows web and native to share selectors for the footer component. */
const useFooterUseSelectors = () => {
  return useSelector(
    state => ({
      authenticated: state.authenticated,
      tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
      isTutorialOn: isTutorial(state),
      fontSize: state.fontSize,
    }),
    shallowEqual,
  )
}

/** Show the user's connection status. */
const Status = () => {
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
      className={css({
        color:
          status === 'preconnecting' || status === 'offline'
            ? 'gray50'
            : status === 'connecting' || status === 'reconnecting'
              ? 'yellow'
              : status === 'connected' || status === 'synced'
                ? 'lightgreen'
                : 'red',
      })}
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
const LinkDivider = () => <span className={css({ margin: '0 6px', userSelect: 'none' })}> | </span>

/** A link that opens a modal. */
const ModalLink: FC<PropsWithChildren<{ id: Modal }>> = ({ id, children }) => {
  const dispatch = useDispatch()
  return (
    <a
      tabIndex={-1}
      {...fastClick(() => dispatch(showModal({ id })))}
      className={cx(extendTap(), css({ whiteSpace: 'nowrap' }))}
    >
      {children}
    </a>
  )
}

/** A button that opens the Help modal. */
const HelpButton: React.FC = () => {
  const dispatch = useDispatch()
  return (
    <div
      {...fastClick(() => dispatch(showModal({ id: 'help' })))}
      title='Help'
      className={css({
        cursor: 'pointer',
        display: 'inline-flex',
        fontWeight: 'bold',
        // extend tap area
        // margin-right less than -10 causes content to scroll horizontally on swipe
        padding: 10,
        margin: '-10px -10px -10px 10px',
        userSelect: 'none',
      })}
    >
      ?
    </div>
  )
}

const liClass = css({
  '&::before': {
    display: 'none',
  },
})

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
    <ul
      aria-label='footer'
      className={css({
        position: 'relative',
        padding: '1.75em',
        margin: '0',
        textAlign: 'right',
        fontSize: '75%',
        listStyle: 'none',
        backgroundColor: { base: '#e4e4e4', _dark: '#1a1a1a' },
        boxSizing: 'border-box',
        width: '100%',
        zIndex: 'modal',
        color: 'fg',
      })}
    >
      <li className={liClass}>
        <div className={css({ float: 'left', lineHeight: 1 })}>
          <a
            data-testid='increase-font'
            className={css({
              paddingLeft: '10px',
              paddingTop: '10px',
              paddingBottom: '10px',
              marginLeft: '-10px',
              fontSize: '1.6em',
              paddingRight: '12px',
              userSelect: 'none',
            })}
            {...fastClick(() => dispatch(fontSizeUp()))}
          >
            A
          </a>
          <a
            data-testid='decrease-font'
            className={css({
              paddingTop: '10px',
              paddingBottom: '10px',
              paddingLeft: '12px',
              paddingRight: '12px',
              userSelect: 'none',
            })}
            {...fastClick(() => dispatch(fontSizeDown()))}
          >
            A
          </a>
        </div>

        <div className={css({ lineHeight: 2, margin: '-0.5em 0' })}>
          <ModalLink id='devices'>Devices</ModalLink>
          <LinkDivider />
          <ModalLink id='settings'>Settings</ModalLink>
          <HelpButton />
        </div>
      </li>
      <br />

      <li className={liClass}>
        <span className={css({ color: 'dim' })}>Status: </span>
        <Status />
      </li>
      <li className={liClass}>
        <span className={css({ color: 'dim' })}>TSID: </span>
        <span className={css({ fontStyle: 'monospace' })}>{tsid}</span>
      </li>

      <li className={liClass}>
        <span className={css({ color: 'dim' })}>App Version: </span>
        {pkg.version}
      </li>
    </ul>
  )
}

export default Footer
