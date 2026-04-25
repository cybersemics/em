import React, { FC, PropsWithChildren, useEffect, useRef } from 'react'
import { css } from '../../../styled-system/css'

/** Height of the gradient that indicates content/scrollability. Kept in sync with DialogContent's bottom spacer, which is half this so the last line of content sits clearly above where the gradient begins. */
const GRADIENT_HEIGHT = 48

/** Soft muted-purple glow concentrated near the top of the glass sheet, fading to transparent toward the bottom. */
const ContainerBackground: FC = () => (
  <div
    className={css({
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      background:
        'radial-gradient(140% 89% at 50% 29%, {colors.dialogGlassFillTop} 0%, {colors.dialogGlassFillMid} 52%, {colors.transparent} 87%)',
    })}
  />
)

/** Full-screen glow image rendered behind the glass sheet as part of the backdrop. */
const BackgroundGlow: FC = () => (
  <div
    className={css({
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)',
      backgroundSize: '250vw 200vh',
      backgroundPosition: 'center bottom',
      backgroundRepeat: 'no-repeat',
      opacity: 0.3,
      pointerEvents: 'none',
    })}
  />
)

/** Simulates light hitting and refracting through the top of the glass sheet. The clipped instance is anchored inside the glass container; the unclipped instance is pinned to the top of the viewport so the bleed sits at the absolute top of the screen. */
const Highlight: FC<{ clipped?: boolean }> = ({ clipped }) => (
  <div
    className={css(
      clipped
        ? {
            position: 'absolute',
            top: 'calc(-50vh + 50%)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100vw',
            height: '40%',
            backgroundImage: 'url(/img/dialog/dialog-highlight.avif)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top center',
            opacity: 0.2,
            pointerEvents: 'none',
          }
        : {
            position: 'fixed',
            top: -72,
            left: 0,
            width: '100vw',
            height: '40vh',
            backgroundImage: 'url(/img/dialog/dialog-highlight.avif)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top center',
            opacity: 0.1,
            pointerEvents: 'none',
          },
    )}
  />
)

/** Simulates rainbow refractions through mist and glass. Rendered both inside and outside the glass container — the unclipped instance bleeds past the edge, while the clipped instance appears trapped in the glass. */
const Rainbow: FC<{ clipped?: boolean }> = ({ clipped }) => (
  <div
    className={css({
      position: 'absolute',
      top: 'calc(-50vh + 50%)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '200vw',
      height: '40%',
      backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'bottom center',
      opacity: clipped ? 0.08 : 0.05,
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    })}
  />
)

/** Gradient border on the glass sheet that fades out toward the bottom via a luminance mask. */
const GlassStroke: FC = () => (
  <div
    className={css({
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      maskImage: 'radial-gradient(94.3% 90.61% at 46.96% 13.01%, white 0%, {colors.dialogGlassMaskFade} 94.3%)',
      WebkitMaskImage: 'radial-gradient(94.3% 90.61% at 46.96% 13.01%, white 0%, {colors.dialogGlassMaskFade} 94.3%)',
    })}
  >
    <div
      className={css({
        position: 'absolute',
        inset: 0,
        borderRadius: '32px',
        borderStyle: 'solid',
        borderColor: 'transparent',
        borderWidth: '1px',
        background:
          'linear-gradient(180deg, {colors.dialogGlassStrokeMuted} 0%, {colors.dialogGlassStrokeMuted} 76%, {colors.dialogGlassStrokeBright} 100%) border-box',
        WebkitMask: 'linear-gradient(white 0 0) padding-box, linear-gradient(white 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(white 0 0) padding-box, linear-gradient(white 0 0)',
        maskComposite: 'exclude',
      })}
    />
  </div>
)

interface DialogProps {
  onClose: () => void
  nodeRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Dialog component with liminal glass treatment.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose, nodeRef }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)

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
    <div
      ref={nodeRef}
      className={css({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        backdropFilter: 'blur(10px)',
        zIndex: 'dialogContainer',
        overflow: 'hidden',
        touchAction: 'none',
      })}
    >
      <BackgroundGlow />

      {/* Container wrapper — allows unclipped highlights to bleed outside the glass */}
      <div className={css({ position: 'relative', maxWidth: '500px', width: '87.5%' })}>
        <Highlight />
        <Rainbow />

        {/* Glass sheet */}
        <div
          ref={dialogRef}
          className={css({
            color: 'fg',
            paddingTop: '0.75rem',
            borderRadius: '32px',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative',
            maxHeight: '80dvh',
          })}
        >
          {/* Decorative layers rely on DOM order for stacking (per project convention — see zIndex schedule in panda.config.ts). Bottom-to-top: container fill → clipped highlights → glass stroke → content → scroll gradient. */}
          <ContainerBackground />
          {/* Rounded clip wrapper for highlight/rainbow layers trapped inside the glass */}
          <div
            className={css({
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              clipPath: 'inset(0 round 32px)',
            })}
          >
            <Highlight clipped />
            <Rainbow clipped />
          </div>
          <GlassStroke />
          <div className={css({ position: 'relative' })}>{children}</div>
          {/* Scroll-edge gradient — visual cue that content is scrollable. */}
          <div
            className={css({
              position: 'absolute',
              bottom: 0,
              right: 0,
              left: 0,
              marginRight: 20,
              pointerEvents: 'none',
              display: 'block',
              background: 'linear-gradient(to top, {colors.dialogScrollShadow} 0%, {colors.transparent} 100%)',
            })}
            style={{ height: `${GRADIENT_HEIGHT}px` }}
          />
        </div>
      </div>
    </div>
  )
}

export default Dialog
