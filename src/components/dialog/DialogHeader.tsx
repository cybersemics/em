import React, { FC, PropsWithChildren, useRef } from 'react'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import useFitText from '../../hooks/useFitText'
import useRemAsPx from '../../hooks/useRemAsPx'
import ArrowLeftIcon from '../icons/ArrowLeftIcon'
import ArrowRightIcon from '../icons/ArrowRightIcon'
import InfoGenieIcon from '../icons/InfoGenieIcon'
import XIcon from '../icons/XIcon'
import CircleButton from './CircleButton'

interface DialogHeaderProps {
  onClose: () => void
  onBack?: () => void
  onForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
}

/** The dialog's title. It follows the user's font size for as long as it fits between the header's buttons, which depends on the width of the phone, and holds the largest size that fits beyond that. */
const DialogTitle: FC<PropsWithChildren> = ({ children }) => {
  const ref = useRef<HTMLHeadingElement>(null)
  useFitText(ref, { text: typeof children === 'string' ? children : '', maxFontSize: useRemAsPx(1.25) })
  return (
    <h2
      ref={ref}
      className={css({
        flex: 1,
        fontWeight: '400',
        color: 'fg',
        borderBottom: 'none',
        margin: 0,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        minWidth: 0,
        // A last resort in case the measurement and the rendered text disagree by a pixel.
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      })}
    >
      {children}
    </h2>
  )
}

/**
 * Dialog header row. Three parts: left button cluster (Back/Forward), centered title,
 * right button cluster (Help/Close). The flex:1 cluster wrappers balance the row so
 * the title stays optically centered.
 *
 * Back and Forward navigate the dialog history. Help remains visual-only.
 */
const DialogHeader: React.FC<PropsWithChildren<DialogHeaderProps>> = ({
  children,
  onClose,
  onBack,
  onForward,
  canGoBack = false,
  canGoForward = false,
}) => {
  const iconFill = token('colors.dialogHeaderButtonIcon')
  // Grows with the font size along with its button, which stops growing at 44px (see CircleButton). 24px at the default font size.
  const iconSize = Math.min(useRemAsPx(1.5), (24 * 44) / 36)
  // Left/right header cluster wrapper — the flex container that holds the circular header buttons.
  // `flex: 1` lets each cluster claim half the row so the centered title sits in the middle.
  // `&:last-child` aligns the right cluster's buttons to the trailing edge.
  const headerSide = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    // The groups keep the width of their buttons, so the title can take the rest of the row. Both hold two buttons, so the title stays centered.
    flex: 'none',
    '&:last-child': {
      justifyContent: 'flex-end',
    },
  })
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        // The header has to fit the width of the dialog, which is bound to the screen, so its horizontal inset is fixed.
        // The vertical inset grows with the text; the bottom is tighter
        // so the search row that follows sits closer to the header.
        paddingInline: '16px',
        paddingTop: '1rem',
        paddingBottom: '0.5rem',
      })}
    >
      <div className={headerSide}>
        <CircleButton ariaLabel='Back' onClick={onBack} disabled={!canGoBack}>
          <ArrowLeftIcon size={iconSize} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Forward' onClick={onForward} disabled={!canGoForward}>
          <ArrowRightIcon size={iconSize} fill={iconFill} />
        </CircleButton>
      </div>
      <DialogTitle>{children}</DialogTitle>
      <div className={headerSide}>
        <CircleButton ariaLabel='Help'>
          <InfoGenieIcon size={iconSize} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Close' onClick={onClose}>
          <XIcon size={iconSize} fill={iconFill} />
        </CircleButton>
      </div>
    </div>
  )
}

export default DialogHeader
