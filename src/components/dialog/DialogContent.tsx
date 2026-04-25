import React, { PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'

/** Buffer above the scroll-edge gradient painted by Dialog.tsx so the last line of content stays clearly visible. Half the gradient height — keep in sync with GRADIENT_HEIGHT in Dialog.tsx. */
const CONTENT_BOTTOM_SPACER_HEIGHT = 24

/**
 * Content for dialog box.
 */
const DialogContent: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      className={css({
        fontSize: '1.125rem',
        color: 'fg',
        maxHeight: '70vh',
        overflowX: 'hidden',
        overflowY: 'auto',
        /* Horizontal text padding lives on the inner wrapper; the small paddingRight here gives the scrollbar breathing room from the modal edge. */
        paddingBlock: '0.5rem',
        paddingRight: '0.5rem',
        scrollbarColor: '{colors.fg} {colors.bg}',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        position: 'relative',
        '@media (min-width: 1200px)': {
          fontSize: '1.5rem',
        },
        overscrollBehavior: 'contain',
      })}
    >
      {/* Inner wrapper carries horizontal padding so text is inset from the modal edges; right is slightly less than left so the visible text inset stays symmetric once the scrollbar gutter is accounted for. */}
      <div className={css({ paddingLeft: '1.25rem', paddingRight: '0.75rem' })}>
        {children}
        {/* Buffer above the scroll-edge gradient so the last piece of actual content is clearly visible. */}
        <div style={{ height: `${CONTENT_BOTTOM_SPACER_HEIGHT}px` }} />
      </div>
    </div>
  )
}

export default DialogContent
