import React, { PropsWithChildren, useEffect, useRef } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'

interface DialogProps {
  onClose: () => void
  nodeRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Dialog component with liminal glass treatment. All styling lives in dialogRecipe.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose, nodeRef }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const dialog = dialogRecipe()

  /**
   * Calls the onClose function when the user clicks outside the dialog.
   */
  useEffect(() => {
    const currentDialogRef = dialogRef.current

    /** When the user clicks outside the dialog, close the dialog. */
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (currentDialogRef && !currentDialogRef.contains(target)) {
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
      const target = e.target as Node
      if (!dialogElement.contains(target)) {
        e.preventDefault()
      }
    }

    overlayElement.addEventListener('touchmove', preventTouchMove, { passive: false })

    return () => {
      overlayElement.removeEventListener('touchmove', preventTouchMove)
    }
  }, [nodeRef])

  return (
    <div ref={nodeRef} className={dialog.overlay}>
      <div className={dialog.backgroundGlow} />

      {/* Container wrapper — allows unclipped highlights to bleed outside the glass */}
      <div className={dialog.wrapper}>
        <div className={dialog.highlightUnclipped} />
        <div className={dialog.rainbowUnclipped} />

        {/* Glass sheet. Decorative layers stack via DOM order: container fill → clipped highlights → glass stroke → content → scroll gradient. */}
        <div ref={dialogRef} className={dialog.glassSheet}>
          <div className={dialog.containerBackground} />
          {/* Rounded clip wrapper for highlight/rainbow layers trapped inside the glass */}
          <div className={dialog.glassClipWrapper}>
            <div className={dialog.highlightClipped} />
            <div className={dialog.rainbowClipped} />
          </div>
          <div className={dialog.glassStrokeMask}>
            <div className={dialog.glassStrokeBorder} />
          </div>
          <div className={dialog.contentLayer}>{children}</div>
          <div className={dialog.scrollGradient} />
        </div>
      </div>
    </div>
  )
}

export default Dialog
