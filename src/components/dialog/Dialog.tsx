import { MotionValue, motion } from 'motion/react'
import React, { PropsWithChildren, useCallback, useEffect, useRef } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'
import useOnClickOutside from '../../hooks/useOnClickOutside'

interface DialogProps {
  animation: { opacity: MotionValue<number>; scale: MotionValue<number> }
  onClose: () => void
  nodeRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Full-screen overlay and scaling wrapper for a liminal glass dialog. Callers compose its parts as children: the glass sheet (DialogGlass) and anything that sits outside it, such as a footer. All styling lives in dialogRecipe.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose, nodeRef, animation }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const dialog = dialogRecipe()

  // Close the dialog when the user clicks or taps outside of it. A press on a surface layered above the dialog, marked
  // data-above-dialog, is not outside it: the dialog is still what the user is working in.
  const closeUnlessAbove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-above-dialog]')) return
      onClose()
    },
    [onClose],
  )
  useOnClickOutside(wrapperRef, closeUnlessAbove)

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
      </motion.div>
    </motion.div>
  )
}

export default Dialog
