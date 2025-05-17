import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import _ from 'lodash'
import pluralize from 'pluralize'
import { FC, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { clearMulticursorsActionCreator as clearMulticursors } from '../../actions/clearMulticursors'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { isTouch } from '../../browser'
import isTutorial from '../../selectors/isTutorial'
import durations from '../../util/durations'
import fastClick from '../../util/fastClick'
import CloseIcon from '../icons/CloseIcon'
import PanelCommandGrid from './PanelCommandGrid'

/** Shows a message with the number of thoughts selected, and a cancel button to deselect all. */
const MultiselectMessage: FC = () => {
  const numMulticursors = useSelector(state => Object.keys(state.multicursors).length)

  if (numMulticursors === 0) return null

  return (
    <div style={{ marginBottom: '1em' }}>
      <span
        className={css({
          fontStyle: 'italic',
          marginRight: '1em',
          color: 'fg',
        })}
      >
        <span
          style={{
            display: 'inline-block',
            minWidth: '1em',
            textAlign: 'right',
          }}
        >
          {numMulticursors}
        </span>{' '}
        {pluralize('thought', numMulticursors, false)} selected
      </span>
    </div>
  )
}

/**
 * A panel that displays the command menu.
 */
const CommandMenuPanel = () => {
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
        transitionDuration={durations.get('medium')}
        // Remove the SwipeAreaProps since we don't want to enable swipe to open
        anchor='bottom'
        // Keep onOpen for programmatic opening
        onOpen={onOpen}
        // Keep onClose for swipe to dismiss
        onClose={onClose}
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
          style: { pointerEvents: 'none', zIndex: token('zIndex.modal') },
        }}
      >
        <div>
          <div className={css({ margin: '1.8rem 1.8rem 1rem' })}>
            <MultiselectMessage />
            <PanelCommandGrid />
          </div>
          <div
            className={css({
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '1rem',
              marginRight: '1rem',
            })}
          >
            <button
              {...fastClick(onClose)}
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
      </SwipeableDrawer>
    )
  }
}

export default CommandMenuPanel
