import SwipeableDrawer, { SwipeableDrawerProps } from '@mui/material/SwipeableDrawer'
import _ from 'lodash'
import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { toggleCommandMenuActionCreator as toggleCommandMenu } from '../../actions/toggleCommandMenu'
import { isTouch } from '../../browser'
import isTutorial from '../../selectors/isTutorial'
import durations from '../../util/durations'
import CloseIcon from '../icons/CloseIcon'
import PanelCommandGrid from './PanelCommandGrid'

// Extend SwipeableDrawer with classes prop
const SwipeableDrawerWithClasses = SwipeableDrawer as unknown as React.ComponentType<
  SwipeableDrawerProps & { classes: any; ref: any }
>

/**
 * A panel that displays the command menu.
 */
const CommandMenuPanel = () => {
  const dispatch = useDispatch()
  const showCommandMenu = useSelector(state => state.showCommandMenu)
  const cursor = useSelector(state => state.cursor)
  const isTutorialOn = useSelector(isTutorial)
  const containerRef = useRef<HTMLInputElement>(null)
  const prevCursorRef = useRef(cursor)

  useEffect(() => {
    // Only close the command menu if cursor becomes inactive but make sure it doesn't close if the cursor is just switching
    if (showCommandMenu && !cursor) {
      const timeoutId = setTimeout(() => {
        // Check if cursor is still inactive after the delay
        if (!cursor) {
          dispatch(toggleCommandMenu({ value: false }))
        }
      }, 200) // Small delay to allow for cursor switching

      return () => clearTimeout(timeoutId)
    }

    prevCursorRef.current = cursor
  }, [showCommandMenu, cursor, dispatch])

  if (isTouch && !isTutorialOn) {
    return (
      <SwipeableDrawerWithClasses
        data-testid='command-menu-panel'
        classes={{
          root: css({
            userSelect: 'none',
            zIndex: 'modal !important',
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
              backgroundColor: 'darkgray',
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
        transitionDuration={durations.get('medium')}
        // Remove the SwipeAreaProps since we don't want to enable swipe to open
        anchor='bottom'
        // Keep onOpen for programmatic opening
        onOpen={() => dispatch(toggleCommandMenu({ value: true }))}
        // Keep onClose for swipe to dismiss
        onClose={() => dispatch(toggleCommandMenu({ value: false }))}
        open={showCommandMenu}
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
        <div>
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
              onClick={() => dispatch(toggleCommandMenu({ value: false }))}
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
