import React, { useEffect, useRef, useState } from 'react'
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
  const isOpen = useSelector(state => state.showGestureCheatsheet)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [isBottomVisible, setIsBottomVisible] = useState(false)

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

  useEffect(() => {
    if (!bottomRef.current || !isOpen) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBottomVisible(entry.isIntersecting)
      },
      {
        root: null, // use viewport
        threshold: 0, // trigger as soon as even 1px is visible
        rootMargin: '0px',
      },
    )

    observer.observe(bottomRef.current)

    return () => {
      observer.disconnect()
    }
  }, [isOpen]) // Reinitialize when dialog opens

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
            <Dialog onClose={handleClose} showGradient={!isBottomVisible}>
              <DialogTitle onClose={handleClose}>Gesture Cheatsheet</DialogTitle>
              <DialogContent>
                <CommandGrid />
                <div ref={bottomRef} style={{ height: '1px' }} />
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </>
  )
}

export default GestureCheatsheet
