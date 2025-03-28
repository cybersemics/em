import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { toggleGestureCheatsheetActionCreator } from '../../actions/toggleGestureCheatsheet'
import { FADEOUT_DURATION } from '../../constants'
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

  return (
    <>
      {isOpen && (
        <>
          <div ref={dialogRef} className={dialogAnimationStyles}>
            <Dialog onClose={handleClose}>
              <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
              <DialogContent>
                <CommandTable viewType='grid' />
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
