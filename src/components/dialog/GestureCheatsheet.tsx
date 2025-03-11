import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { closeDialogActionCreator } from '../../actions/closeDialog'
import { FADEOUT_DURATION } from '../../constants'
import CommandGrid from '../CommandGrid'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Gesture cheatsheet component.
 */
const GestureCheatsheet: React.FC = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.dialogOpen)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  /**
   * Handles the closure of the gesture cheatsheet.
   */
  const handleClose = () => {
    if (dialogRef.current) {
      dialogRef.current.style.opacity = '0'
      setTimeout(() => {
        dispatch(closeDialogActionCreator())
      }, FADEOUT_DURATION)
    }
  }

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.style.opacity = '1'
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  /** Styles for the dialog fade in and out animation. */
  const dialogAnimationStyles = css({
    opacity: 0,
    transition: 'opacity 0.5s ease',
    willChange: 'opacity',
    zIndex: 'modal',
    position: 'fixed',
  })

  /** Styles for the dialog content. */
  const dialogStyles = css({
    maxHeight: '70vh',
    overflow: 'auto',
    padding: '1rem',
    scrollbarColor: '{colors.fg} {colors.bg}',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: '{colors.bg}',
    },
  })

  return (
    <>
      {isOpen && (
        <>
          <div ref={dialogRef} className={dialogAnimationStyles}>
            <Dialog onClose={handleClose}>
              <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
              <DialogContent>
                <div className={dialogStyles}>
                  <CommandGrid />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </>
  )
}

export default GestureCheatsheet
