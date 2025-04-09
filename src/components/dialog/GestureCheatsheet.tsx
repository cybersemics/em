import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { toggleGestureCheatsheetActionCreator } from '../../actions/toggleGestureCheatsheet'
import allowScroll from '../../device/disableScroll'
import CommandTable from '../CommandTable'
import FadeTransition from '../FadeTransition'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Gesture cheatsheet component.
 */
const GestureCheatsheet: React.FC = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showGestureCheatsheet)

  /**
   * Handles the closure of the gesture cheatsheet.
   */
  const handleClose = () => {
    dispatch(toggleGestureCheatsheetActionCreator({ value: false }))
  }

  useEffect(() => {
    /** Disable scrolling when the dialog is open. */
    allowScroll(!isOpen)

    return () => {
      allowScroll(true)
    }
  }, [isOpen])

  return (
    <FadeTransition in={isOpen} unmountOnExit duration='medium'>
      <div
        className={css({
          zIndex: 'dialogContainer',
          position: 'fixed',
        })}
      >
        <Dialog onClose={handleClose}>
          <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
          <DialogContent>
            <CommandTable viewType='grid' />

            {/* In Dialog's styles, we fix a gradient to the bottom of the dialog to subtly indicate that
                the dialog is scrollable.
                When the dialog reaches the bottom, we want to ensure the gradient is no
                longer visible.
                Adding a 64px margin to the bottom of the dialog content ensures that the gradient
                is not visible, and signals to the user that they have reached the bottom of the dialog.
            */}
            <div
              style={{
                height: '64px',
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </FadeTransition>
  )
}

export default GestureCheatsheet
