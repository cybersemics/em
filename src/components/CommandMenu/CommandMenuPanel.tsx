import SwipeableDrawer, { SwipeableDrawerProps } from '@mui/material/SwipeableDrawer'
import _ from 'lodash'
import React, { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { closeCommandMenuActionCreator } from '../../actions/closeCommandMenu'
import { showCommandMenuActionCreator } from '../../actions/showCommandMenu'
import { isTouch } from '../../browser'
import isTutorial from '../../selectors/isTutorial'
import CloseIcon from '../icons/CloseIcon'
import PanelCommandGrid from './PanelCommandGrid'

interface CommandMenuPanelProps {}

// Extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<
  SwipeableDrawerProps & { classes: any; ref: any }
>

/**
 * A panel that displays the command menu.
 */
const CommandMenuPanel: React.FC<CommandMenuPanelProps> = () => {
  const dispatch = useDispatch()
  const commandMenuOpen = useSelector(state => state.commandMenuOpen)
  const isTutorialOn = useSelector(isTutorial)
  const containerRef = useRef<HTMLInputElement>(null)
  const [isSwiping, setIsSwiping] = useState(false)

  /** Toggle the command menu. */
  const toggleCommandMenu = (value: boolean) => {
    if (value) {
      dispatch(showCommandMenuActionCreator())
    } else {
      dispatch(closeCommandMenuActionCreator())
    }
  }

  if (isTouch && !isTutorialOn) {
    return (
      <SwipeableDrawerWithClasses
        data-testid='command-menu-panel'
        classes={{
          root: css({
            userSelect: 'none',
            zIndex: 'navbar !important',
          }),
          modal: css({
            '& .MuiDrawer-root': {
              pointerEvents: 'none',
            },
            '& div[role="presentation"]': {
              pointerEvents: 'none',
            },
          }),
          paper: css({
            // Increase specificity by nesting the selector
            '&.MuiDrawer-paper': {
              backgroundColor: '{colors.darkgray}',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              overflow: 'hidden',
              maxHeight: '70%',
              pointerEvents: 'auto',
            },
          }),
          backdrop: css({
            display: 'none',
            pointerEvents: 'none',
          }),
        }}
        // Disable swipe to open - this removes the swipe-up-to-open functionality
        disableSwipeToOpen={true}
        ref={containerRef}
        transitionDuration={500}
        // Remove the SwipeAreaProps since we don't want to enable swipe to open
        anchor='bottom'
        // Keep onOpen for programmatic opening
        onOpen={() => toggleCommandMenu(true)}
        // Keep onClose for swipe to dismiss
        onClose={() => toggleCommandMenu(false)}
        open={commandMenuOpen}
        hideBackdrop={true}
        disableScrollLock={true}
        // Use PaperProps to directly target the Paper component
        PaperProps={{
          style: {
            backgroundColor: token('colors.darkgray'),
            // Make sure it overrides any inline styles
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            overflow: 'hidden',
            maxHeight: '70%',
            pointerEvents: 'auto',
          },
        }}
        ModalProps={{
          disableAutoFocus: true,
          disableEnforceFocus: true,
          disableRestoreFocus: true,
          style: { pointerEvents: 'none' },
        }}
      >
        <div
          onTouchMove={_.throttle(
            () => {
              if (isSwiping) return
              const drawer = containerRef.current?.querySelector('.MuiDrawer-paper') as HTMLElement | null
              if (!drawer) return
              const transformValue = drawer.style.transform
              const translateYMatch = transformValue.match(/translateY\(([^)]+)\)/)
              if (translateYMatch && translateYMatch[1]) {
                const translateY = parseInt(translateYMatch[1])
                if (!isNaN(translateY) && translateY !== 0) {
                  setIsSwiping(true)
                }
              }
            },
            10,
            { leading: false },
          )}
          onTouchEnd={() => {
            setIsSwiping(false)
          }}
        >
          <PanelCommandGrid />
          <div
            className={css({
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '1rem',
              marginRight: '1rem',
            })}
          >
            <button
              onClick={() => dispatch(closeCommandMenuActionCreator())}
              className={css({
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              })}
            >
              <CloseIcon size={20} fill={token('colors.fg')} />
            </button>
          </div>
        </div>
      </SwipeableDrawerWithClasses>
    )
  }
}

export default CommandMenuPanel
