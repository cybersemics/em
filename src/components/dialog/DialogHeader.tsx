import React, { PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import ArrowLeftIcon from '../icons/ArrowLeftIcon'
import ArrowRightIcon from '../icons/ArrowRightIcon'
import InfoGenieIcon from '../icons/InfoGenieIcon'
import XIcon from '../icons/XIcon'
import CircleButton from './CircleButton'

interface DialogHeaderProps {
  onClose: () => void
}

/**
 * Dialog header row. Three parts: left button cluster (Back/Forward), centered title,
 * right button cluster (Help/Close). The flex:1 cluster wrappers balance the row so
 * the title stays optically centered.
 *
 * Back / Forward / Help are visual-only per the spec — they don't dispatch yet.
 */
const DialogHeader: React.FC<PropsWithChildren<DialogHeaderProps>> = ({ children, onClose }) => {
  const iconFill = token('colors.dialogHeaderButtonIcon')
  // Left/right header cluster wrapper — the flex container that holds the circular header buttons.
  // `flex: 1` lets each cluster claim half the row so the centered title sits in the middle.
  // `&:last-child` aligns the right cluster's buttons to the trailing edge.
  const headerSide = css({
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
    '&:last-child': {
      justifyContent: 'flex-end',
    },
  })
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        // 1rem inset on the sides and the top edge of the dialog; the bottom is tighter
        // so the search row that follows sits closer to the header.
        paddingInline: '1rem',
        paddingTop: '1rem',
        paddingBottom: '0.5rem',
      })}
    >
      <div className={headerSide}>
        <CircleButton ariaLabel='Back'>
          <ArrowLeftIcon size={24} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Forward'>
          <ArrowRightIcon size={24} fill={iconFill} />
        </CircleButton>
      </div>
      <h2
        className={css({
          fontWeight: '400',
          color: 'fg',
          borderBottom: 'none',
          fontSize: '1.25rem',
          margin: 0,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        })}
      >
        {children}
      </h2>
      <div className={headerSide}>
        <CircleButton ariaLabel='Help'>
          <InfoGenieIcon size={24} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Close' onClick={onClose}>
          <XIcon size={24} fill={iconFill} />
        </CircleButton>
      </div>
    </div>
  )
}

export default DialogHeader
