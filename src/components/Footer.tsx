import React, { FC, PropsWithChildren, useEffect, useRef, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import pkg from '../../package.json'
import { css, cx } from '../../styled-system/css'
import { extendTapRecipe } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import Modal from '../@types/Modal'
import { alertActionCreator as alert } from '../actions/alert'
import fontSizeDown from '../actions/fontSizeDown'
import fontSizeUp from '../actions/fontSizeUp'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { TUTORIAL2_STEP_SUCCESS } from '../constants'
import { tsid } from '../data-providers/thoughtspaceSession'
import scrollTo from '../device/scrollTo'
import getSetting from '../selectors/getSetting'
import isTutorial from '../selectors/isTutorial'
import backgroundGlowStore from '../stores/backgroundGlowStore'
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
      className={cx(extendTapRecipe(), css({ whiteSpace: 'nowrap' }))}
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

/** Background glow images available in the debug picker, served from public/img/glow as glow-<name>.avif. */
const glowImages = ['3a', '3b', '3c', '11']

const glowSwatchClass = css({
  display: 'inline-block',
  textDecoration: 'none',
  width: '3em',
  height: '3em',
  borderRadius: '4px',
  border: 'solid 2px {colors.gray50}',
  backgroundColor: 'bg',
  backgroundSize: 'cover',
  backgroundPosition: 'bottom center',
  cursor: 'pointer',
  lineHeight: '2.8em',
  textAlign: 'center',
  userSelect: 'none',
})

/** A sparkle button that opens a popup for choosing a background glow image (or none) and its opacity. A debug interface persisted to local storage. */
const BackgroundGlowPicker = () => {
  const [showPicker, setShowPicker] = useState(false)
  const { image, opacity } = backgroundGlowStore.useState()

  return (
    <div className={css({ display: 'inline-block', position: 'relative' })}>
      <a
        data-testid='background-glow'
        title='Background Glow'
        {...fastClick(() => setShowPicker(show => !show))}
        className={css({
          display: 'inline-block',
          paddingTop: '10px',
          paddingBottom: '10px',
          paddingLeft: '12px',
          paddingRight: '12px',
          userSelect: 'none',
        })}
      >
        <svg
          width='1.3em'
          height='1.3em'
          viewBox='0 0 24 24'
          fill='currentColor'
          className={css({ verticalAlign: '-0.3em' })}
        >
          <path d='M11 2c.44 5.24 3.36 8.16 8.6 8.6-5.24.44-8.16 3.36-8.6 8.6-.44-5.24-3.36-8.16-8.6-8.6C7.64 10.16 10.56 7.24 11 2Z' />
          <path d='M18.5 15c.24 2.86 1.84 4.46 4.7 4.7-2.86.24-4.46 1.84-4.7 4.7-.24-2.86-1.84-4.46-4.7-4.7 2.86-.24 4.46-1.84 4.7-4.7Z' />
        </svg>
      </a>
      {showPicker && (
        <div
          className={css({
            position: 'absolute',
            bottom: '2.8em',
            left: '-10px',
            zIndex: 'stack',
            backgroundColor: 'pickerBg',
            borderRadius: '8px',
            padding: '0.75em',
            width: 'max-content',
            textAlign: 'left',
          })}
        >
          <div className={css({ display: 'flex', gap: '0.5em' })}>
            <a
              title='None'
              {...fastClick(() => backgroundGlowStore.update({ image: null }))}
              className={glowSwatchClass}
              style={{ borderColor: image === null ? token('colors.fg') : undefined }}
            >
              ✕
            </a>
            {glowImages.map(name => {
              const glowImage = `glow-${name}.avif`
              return (
                <a
                  key={name}
                  title={glowImage}
                  {...fastClick(() => backgroundGlowStore.update({ image: glowImage }))}
                  className={glowSwatchClass}
                  style={{
                    backgroundImage: `url(/img/glow/${glowImage})`,
                    borderColor: image === glowImage ? token('colors.fg') : undefined,
                  }}
                >
                  {/* The images are dark in both themes, so the watermark uses a theme-invariant light color, further dimmed by opacity. */}
                  <span className={css({ color: 'gestureMenuLabel', opacity: 0.6, fontSize: '0.85em' })}>{name}</span>
                </a>
              )
            })}
          </div>
          <div className={css({ display: 'flex', alignItems: 'center', gap: '0.5em', marginTop: '0.75em' })}>
            <span className={css({ color: 'dim' })}>Opacity</span>
            <input
              type='range'
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={e => backgroundGlowStore.update({ opacity: +e.target.value })}
              // prevent the browser from scrolling the page while dragging the slider handle
              className={css({ flexGrow: 1, touchAction: 'none' })}
            />
          </div>
        </div>
      )}
    </div>
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

  const _fontSize = useRef(fontSize)

  // alert when font size changes
  useEffect(() => {
    // prevent alert dispatch when rendered for first time
    if (_fontSize.current !== fontSize) {
      dispatch(alert(`Font size: ${fontSize}`))
      scrollTo('bottom')
      _fontSize.current = fontSize
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
        backgroundColor: 'footerBg',
        boxSizing: 'border-box',
        width: '100%',
        zIndex: 'footer',
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
          <BackgroundGlowPicker />
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
      <li className={liClass}>
        <span className={css({ color: 'dim' })}>Commit: </span>
        <span className={css({ fontStyle: 'monospace' })}>{__COMMIT_HASH__}</span>
      </li>
    </ul>
  )
}

export default Footer
