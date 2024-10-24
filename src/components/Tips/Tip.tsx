import { FC, PropsWithChildren } from 'react'
import { css } from '../../../styled-system/css'

/** A tip that gets displayed at the bottom of the window. */
const Tip: FC<
  PropsWithChildren<{
    display: boolean
  }>
> = ({ display, children }) => {
  return (
    <div
      className={css({
        position: 'fixed',
        bottom: '1em',
        left: '0',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        // disable pointer revents when hidden, otherwise it will block clicks on the NavBar
        pointerEvents: display ? 'auto' : 'none',
        transform: display ? 'translateY(0)' : 'translateY(100%)',
        transition: `transform {durations.fastDuration} ease-in-out, opacity {durations.fastDuration} ease-in-out`,
        opacity: display ? '1' : '0',
        zIndex: 'popup',
      })}
    >
      <div
        className={css({
          backgroundColor: '#333',
          display: 'inline-block',
          padding: '1em',
          maxWidth: '20em',
          borderRadius: '5',
          textAlign: 'center',
          color: '#ccc',
        })}
      >
        {children}
      </div>
    </div>
  )
}

Tip.displayName = 'Tip'

export default Tip
