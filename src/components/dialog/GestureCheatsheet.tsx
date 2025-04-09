import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { toggleGestureCheatsheetActionCreator } from '../../actions/toggleGestureCheatsheet'
import { FADEOUT_DURATION } from '../../constants'
import allowScroll from '../../device/disableScroll'
import CommandTable from '../CommandTable'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Gesture cheatsheet component.
 */
const GestureCheatsheet: React.FC = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showGestureCheatsheet)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  /**
   * Handles the closure of the gesture cheatsheet.
   */
  const handleClose = () => {
    if (dialogRef.current) {
      dialogRef.current.style.opacity = '0'
      setTimeout(() => {
        dispatch(toggleGestureCheatsheetActionCreator({ value: false }))
      }, FADEOUT_DURATION)
    }
  }

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.style.opacity = '1'
    }
  }, [isOpen])

  useEffect(() => {
    /** Disable scrolling when the dialog is open. */
    allowScroll(!isOpen)

    return () => {
      allowScroll(true)
    }
  }, [isOpen])

  /** Styles for the dialog fade in and out animation. */
  const dialogAnimationStyles = css({
    opacity: 0,
    transition: 'opacity {durations.medium} ease',
    willChange: 'opacity',
    zIndex: 'dialogContainer',
    position: 'fixed',
  })

  return (
    <>
      {isOpen && (
        <>
          <div ref={dialogRef} className={dialogAnimationStyles}>
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
        </>
      )}
    </>
  )
}

export default GestureCheatsheet
