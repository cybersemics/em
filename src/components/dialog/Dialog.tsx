import React, { PropsWithChildren, useEffect, useRef } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

interface DialogProps {
  onClose: () => void
  nodeRef: React.RefObject<HTMLDivElement>
}

/**
 * Dialog component.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose, nodeRef }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
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
   * Disable swipe-to-go-back.
   * On iOS Safari, swiping from the left edge of the page functions similarly to hitting the back button.
   * This is disabled in the main app, probably by MultiGesture, and needs to be disabled while a dialog is open.
   */
  useEffect(() => {
    const overlayElement = nodeRef.current
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
  }, [nodeRef])

  return (
    <div ref={nodeRef} className={dialogClasses.overlay}>
      <div ref={dialogRef} className={dialogClasses.container}>
        {children}
        <div className={dialogClasses.gradient} />
      </div>
    </div>
  )
}

export default Dialog
