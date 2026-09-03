import React, { PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'

interface CircleButtonProps {
  onClick?: () => void
  ariaLabel: string
  disabled?: boolean
}

/**
 * Reusable circular modal-header button. Used four times in the Command Universe header
 * (Back, Forward, Help, Close). The caller supplies the icon as children.
 */
const CircleButton: React.FC<PropsWithChildren<CircleButtonProps>> = ({ onClick, ariaLabel, disabled, children }) => {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={css({
        width: '36px',
        height: '36px',
        minWidth: '36px',
        minHeight: '36px',
        borderRadius: '50%',
        border: 'none',
        // Subtle white sheen from upper-left to lower-right — softens the otherwise flat translucent fill into something glassy.
        background:
          'linear-gradient(191.32deg, {colors.dialogHeaderButtonBg} 5.64%, {colors.dialogHeaderButtonBgFade} 83.21%)',
        // Soft lavender outer glow.
        boxShadow: '0 0 8.7px {colors.dialogHeaderButtonShadow}',

        /* Gradient border stroke. This isn't natively supported in CSS, so use a trick:
          ::before pseudoelement to paint a gradient background and mask out the center so only the 1px border slice shows. */
        position: 'relative',
        _before: {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: '1px',
          background:
            'linear-gradient(180deg, {colors.dialogHeaderButtonBorder} 0%, {colors.dialogHeaderButtonBorderFade} 100%)',
          WebkitMask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(white 0 0) content-box, linear-gradient(white 0 0)',
          maskComposite: 'exclude',
          pointerEvents: 'none',
          opacity: 0.35,
        },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        color: 'fg',
        /** On press, the button's fill brightens to provide feedback.
         * It's not possible to directly animate a background gradient, so instead of trying
         * to shift the gradient colors on hover/press, use another pseudoelement with the
         * hover-state gradient stacked on top of the base button, and animate that
         * from transparent to opaque on hover/press.
         */
        isolation: 'isolate',
        _after: {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background:
            'linear-gradient(191.32deg, {colors.dialogHeaderButtonBgHover} 5.64%, {colors.dialogHeaderButtonBgFade} 83.21%)',
          opacity: 0,
          transition: 'opacity {durations.fast} ease-out',
          pointerEvents: 'none',
          zIndex: -1,
        },
        _active: {
          _after: {
            opacity: 1,
          },
        },
      })}
    >
      {children}
    </button>
  )
}

export default CircleButton
