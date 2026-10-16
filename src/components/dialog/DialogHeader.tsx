import { PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'

/** Presents a dialog header row; its caller composes the title and controls. */
const DialogHeader = ({ children }: PropsWithChildren) => (
  <div
    className={css({
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      paddingInline: '1rem',
      paddingTop: '1rem',
      paddingBottom: '0.5rem',
      md: { gap: '0.5rem' },
    })}
  >
    {children}
  </div>
)

export default DialogHeader
