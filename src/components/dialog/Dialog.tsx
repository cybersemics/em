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
    // Full-viewport backdrop with blur.
    <div ref={nodeRef} className={dialog.overlay}>
      {/* Soft full-screen color glow rendered behind the glass. */}
      <div className={dialog.backgroundGlow} />

      {/* Wrapper around the glass sheet — lets unclipped highlights bleed past the glass edges. */}
      <div className={dialog.wrapper}>
        {/* Top-of-screen light highlight that bleeds past the glass top edge. */}
        <div className={dialog.highlightUnclipped} />
        {/* Rainbow refraction that bleeds past the glass top edge. */}
        <div className={dialog.rainbowUnclipped} />

        {/* The glass sheet itself. Decorative layers stack via DOM order: container fill → clipped highlights → glass stroke → content → scroll gradient. */}
        <div ref={dialogRef} className={dialog.glassSheet}>
          {/* Muted-purple radial fill concentrated near the top of the glass. */}
          <div className={dialog.containerBackground} />
          {/* Rounded clip region containing the highlights "trapped" inside the glass. */}
          <div className={dialog.glassClipWrapper}>
            {/* Light highlight trapped inside the glass. */}
            <div className={dialog.highlightClipped} />
            {/* Rainbow refraction trapped inside the glass. */}
            <div className={dialog.rainbowClipped} />
          </div>
          {/* Luminance mask that fades the glass stroke off toward the bottom. */}
          <div className={dialog.glassStrokeMask}>
            {/* Gradient border simulating light refracting through the glass edge. */}
            <div className={dialog.glassStrokeBorder} />
          </div>
          {/* Dialog content (title + body). */}
          <div className={dialog.contentLayer}>{children}</div>
          {/* Bottom fade — visual cue that the dialog content is scrollable. */}
          <div className={dialog.scrollGradient} />
        </div>
      </div>
    </div>
  )
}

export default Dialog
