import React, { PropsWithChildren, useEffect, useRef } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

interface DialogProps {
  onClose: () => void
}

/**
 * Dialog component.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dialogClasses = dialogRecipe()

  /**
   * Calls the onClose function when the user clicks outside the dialog.
   */
  useEffect(() => {
    const currentDialogRef = dialogRef.current

    /** When the user clicks outside the dialog, close the dialog. */
    const handleClickOutside = (event: MouseEvent) => {
      if (currentDialogRef && !currentDialogRef.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  /**
   * Disable scroll while the dialog is open.
   * On iOS, there was a bug where the user could scroll the page via the modal overlay.
   * It's difficult to disable scrolling entirely on iOS, so this effect prevents scrolling
   * on the modal overlay by preventing touch events.
   */
  useEffect(() => {
    const overlayElement = overlayRef.current
    const dialogElement = dialogRef.current

    if (!overlayElement || !dialogElement) return

    /** This event handler prevents touch events from propagating to the page. */
    const preventTouchMove = (e: TouchEvent) => {
      if (!dialogElement.contains(e.target as Node)) {
        // Only prevent scrolling if NOT inside dialog content
        e.preventDefault()
      }
    }

    overlayElement.addEventListener('touchmove', preventTouchMove, { passive: false })

    return () => {
      overlayElement.removeEventListener('touchmove', preventTouchMove)
    }
  }, [])

  return (
    <div ref={overlayRef} className={dialogClasses.overlay}>
      <div ref={dialogRef} className={dialogClasses.container}>
        {children}
        <div className={dialogClasses.gradient} />
      </div>
    </div>
  )
}

export default Dialog
