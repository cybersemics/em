import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import _ from 'lodash'
import pluralize from 'pluralize'
import { FC, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { clearMulticursorsActionCreator as clearMulticursors } from '../../actions/clearMulticursors'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { isTouch } from '../../browser'
import categorize from '../../commands/categorize'
import copyCursorCommand from '../../commands/copyCursor'
import deleteCommand from '../../commands/delete'
import favorite from '../../commands/favorite'
import indent from '../../commands/indent'
import note from '../../commands/note'
import outdent from '../../commands/outdent'
import swapParent from '../../commands/swapParent'
import uncategorize from '../../commands/uncategorize'
import isTutorial from '../../selectors/isTutorial'
import durations from '../../util/durations'
import fastClick from '../../util/fastClick'
import FadeTransition from '../FadeTransition'
import PanelCommand from './PanelCommand'
import PanelCommandGroup from './PanelCommandGroup'

/**
 * A custom hook that returns the last non-zero number of multicursors.
 * This is used to avoid showing the MultiselectMessage changing as the Command Menu is closed.
 */
const useNonzeroNumMulticursors = () => {
  const numMulticursors = useSelector(state => Object.keys(state.multicursors).length)
  const lastNumMulticursorsRef = useRef(numMulticursors)

  // update ref if numMulticursors is not zero
  if (numMulticursors !== 0) {
    lastNumMulticursorsRef.current = numMulticursors
  }

  return lastNumMulticursorsRef.current
}

/** Shows a message with the number of thoughts selected, and a cancel button to deselect all. */
const MultiselectMessage: FC = () => {
  const displayNumMulticursors = useNonzeroNumMulticursors()
  return (
    <div>
      <span
        className={css({
          color: 'fg',
          fontWeight: 700,
          letterSpacing: '-0.011em',
          mixBlendMode: 'screen',
          opacity: 0.6,
          fontSize: '1.3em',
        })}
      >
        {displayNumMulticursors} {pluralize('thought', displayNumMulticursors, false)} selected
      </span>
    </div>
  )
}

/** Command menu gradient overlay. Fades in when the Command Menu opens. */
const Overlay = () => {
  const showCommandMenu = useSelector(state => state.showCommandMenu)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <FadeTransition nodeRef={ref} in={showCommandMenu} type='commandMenuDrawer' unmountOnExit>
      <div
        // Passing the ref in is required, due to position absolute child.
        ref={ref}
        className={css({
          position: 'absolute',
          pointerEvents: 'none',
          backgroundImage: 'url(/img/command-center/overlay.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          mixBlendMode: 'screen',
          height: '100vh',
          width: '100%',
          bottom: 0,
        })}
      />
    </FadeTransition>
  )
}

/**
 * A panel that displays the command menu.
 */
const CommandMenu = () => {
  const dispatch = useDispatch()
  const showCommandMenu = useSelector(state => state.showCommandMenu)
  const isTutorialOn = useSelector(isTutorial)

  const onOpen = useCallback(() => {
    dispatch(toggleDropdown({ dropDownType: 'commandMenu', value: true }))
  }, [dispatch])

  const onClose = useCallback(() => {
    dispatch([toggleDropdown({ dropDownType: 'commandMenu', value: false }), clearMulticursors()])
  }, [dispatch])

  if (isTouch && !isTutorialOn) {
    return (
      <SwipeableDrawer
        data-testid='command-menu-panel'
        // Disable swipe to open - this removes the swipe-up-to-open functionality
        disableSwipeToOpen={true}
        transitionDuration={durations.get('commandMenuDrawer')}
        // Remove the SwipeAreaProps since we don't want to enable swipe to open
        anchor='bottom'
        // Keep onOpen for programmatic opening
        onOpen={onOpen}
        // Keep onClose for swipe to dismiss
        onClose={onClose}
        open={showCommandMenu}
        hideBackdrop={true}
        disableScrollLock={true}
        PaperProps={{
          style: {
            backgroundColor: 'transparent',
            // Make sure it overrides any inline styles
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            overflow: 'visible',
            maxHeight: '70%',
            pointerEvents: 'auto',
            boxShadow: 'none',
          },
        }}
        ModalProps={{
          disableAutoFocus: true,
          disableEnforceFocus: true,
          disableRestoreFocus: true,
          style: {
            pointerEvents: 'none',
            zIndex: token('zIndex.modal'),
            backgroundColor: 'transparent',
          },
        }}
      >
        <div
          /** Progressive Blur. */
          className={css({
            pointerEvents: 'none',
            position: 'absolute',
            backdropFilter: 'blur(2px)',
            mask: 'linear-gradient(180deg, {colors.bgTransparent} 0%, black 110px, black 100%)',
            bottom: 0,
            width: '100%',
            height: 'calc(100% + 110px)',
          })}
        />
        <div
          className={css({
            position: 'relative',
            // prevent mix-blend-mode and backdrop-filter from affecting each other
            isolation: 'isolate',
          })}
        >
          <div
            /** Falloff. */
            className={css({
              pointerEvents: 'none',
              position: 'absolute',
              background: 'linear-gradient(180deg, {colors.bgTransparent} 0%, {colors.bg} 1.2rem)',
              paddingTop: '0.8rem',
              bottom: 0,
              width: '100%',
              height: '100%',
            })}
          />
          <Overlay />

          <div
            className={css({
              position: 'relative',
              margin: '0 1.9rem calc(1.9rem + env(safe-area-inset-bottom)) 1.9rem',
            })}
          >
            <div className={css({ marginBottom: '1rem' })}>
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  width: '100%',
                })}
              >
                <MultiselectMessage />
                <div
                  className={css({
                    position: 'relative',
                    fontSize: '0.85em',
                    fontWeight: 500,
                    letterSpacing: '-0.011em',
                    color: 'fg',
                  })}
                >
                  <div
                    className={css({
                      position: 'absolute',
                      background: 'fgOverlay20',
                      borderRadius: 46,
                      mixBlendMode: 'soft-light',
                      height: '100%',
                      width: '100%',
                    })}
                  />
                  <button
                    {...fastClick(onClose)}
                    className={css({
                      all: 'unset',
                      mixBlendMode: 'lighten',
                      opacity: 0.5,
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '8px 16px',
                    })}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridTemplateRows: 'auto',
                gridAutoFlow: 'row',
                gap: '0.7rem',
                maxWidth: '100%',
              })}
            >
              <PanelCommand command={{ ...copyCursorCommand, label: 'Copy' }} size='small' />
              <PanelCommand command={note} size='small' />
              <PanelCommand command={{ ...favorite, label: 'Favorite' }} size='small' />
              <PanelCommand command={deleteCommand} size='small' />
              <PanelCommandGroup commandSize='small' commandCount={2}>
                <PanelCommand command={{ ...outdent, label: '' }} size='small' />
                <PanelCommand command={{ ...indent, label: '' }} size='small' />
              </PanelCommandGroup>
              <PanelCommand command={swapParent} size='medium' />
              <PanelCommand command={categorize} size='medium' />
              <PanelCommand command={uncategorize} size='medium' />
            </div>
          </div>
        </div>
      </SwipeableDrawer>
    )
  }
}

export default CommandMenu
