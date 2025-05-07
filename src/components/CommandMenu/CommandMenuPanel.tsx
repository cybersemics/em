import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import _ from 'lodash'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { toggleDropdownActionCreator } from '../../actions/toggleDropdown'
import { isTouch } from '../../browser'
import isTutorial from '../../selectors/isTutorial'
import durations from '../../util/durations'
import CloseIcon from '../icons/CloseIcon'
import PanelCommandGrid from './PanelCommandGrid'

/**
 * A panel that displays the command menu.
 */
const CommandMenuPanel = () => {
  const dispatch = useDispatch()
  const showCommandMenu = useSelector(state => state.showCommandMenu)
  const isTutorialOn = useSelector(isTutorial)

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
        onOpen={() => dispatch(toggleDropdownActionCreator({ dropDownType: 'commandMenu', value: true }))}
        // Keep onClose for swipe to dismiss
        onClose={() => dispatch(toggleDropdownActionCreator({ dropDownType: 'commandMenu', value: false }))}
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
              onClick={() => dispatch(toggleDropdownActionCreator({ dropDownType: 'commandMenu', value: false }))}
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
