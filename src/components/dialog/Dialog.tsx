import { MotionValue, motion } from 'motion/react'
import React, { PropsWithChildren, useEffect, useRef } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'
import useOnClickOutside from '../../hooks/useOnClickOutside'

interface DialogProps {
  animation: { opacity: MotionValue<number>; scale: MotionValue<number> }
  footer?: React.ReactNode
  onClose: () => void
  nodeRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Dialog component with liminal glass treatment. All styling lives in dialogRecipe.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose, nodeRef, animation, footer }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const dialog = dialogRecipe()

  // Close the dialog when the user clicks or taps outside of it.
  useOnClickOutside(wrapperRef, onClose)

  /**
   * Disable swipe-to-go-back.
   * On iOS Safari, swiping from the left edge of the page functions similarly to hitting the back button.
   * This is disabled in the main app, probably by MultiGesture, and needs to be disabled while a dialog is open.
   */
  useEffect(() => {
    const overlayElement = nodeRef.current
    const dialogElement = wrapperRef.current

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
    <motion.div ref={nodeRef} className={dialog.overlay} style={{ opacity: animation.opacity }}>
      {/* Soft full-screen color glow rendered behind the glass. */}
      <div className={dialog.backgroundGlow} />

      {/* Wrapper around the glass sheet — lets unclipped highlights bleed past the glass edges. */}
      <motion.div ref={wrapperRef} className={dialog.wrapper} style={{ scale: animation.scale }}>
        {/* Top-of-screen light highlight that bleeds past the glass top edge. */}
        <div className={dialog.highlightUnclipped} />
        {/* Rainbow refraction that bleeds past the glass top edge. */}
        <div className={dialog.rainbowUnclipped} />

        {children}
        {footer}
      </motion.div>
    </motion.div>
  )
}

export default Dialog
