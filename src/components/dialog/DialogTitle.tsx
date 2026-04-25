import React, { PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'
import CloseButton from './CloseButton'

interface DialogTitleProps {
  onClose: () => void
}

/**
 * Dialog title.
 */
const DialogTitle: React.FC<PropsWithChildren<DialogTitleProps>> = ({ children, onClose }) => {
  return (
    <div
      className={css({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        /* Horizontal gutter lives here so the title and close button share a consistent inset from the modal edges. Matches the content text indent. */
        paddingInline: '1.25rem',
      })}
    >
      <h2
        className={css({
          fontWeight: '700',
          color: 'fg',
          borderBottom: 'none',
          fontSize: '1.25rem',
          margin: '0.625rem 0',
          '@media (min-width: 1200px)': {
            fontSize: '1.75rem',
          },
        })}
      >
        {children}
      </h2>
      <CloseButton onClick={onClose} />
    </div>
  )
}

export default DialogTitle
