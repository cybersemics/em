import { FC, PropsWithChildren } from 'react'
import { token } from '../../../styled-system/tokens'

interface TipProps {
  display: boolean
}

/** A tip that gets displayed at the bottom of the window. */
const Tip: FC<PropsWithChildren<TipProps>> = ({ display, children }, ref) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1em',
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        transform: display ? 'translateY(0)' : 'translateY(100%)',
        transition: `transform ${token('durations.tipTransitionDuration')} ease-in-out, opacity ${token('durations.tipTransitionDuration')} ease-in-out`,
        opacity: display ? 1 : 0,
      }}
      className='z-index-popup'
    >
      <div
        style={{
          backgroundColor: '#333',
          display: 'inline-block',
          padding: '1em',
          maxWidth: '20em',
          borderRadius: 5,
          textAlign: 'center',
          color: '#ccc',
        }}
      >
        {children}
      </div>
    </div>
  )
}

Tip.displayName = 'Tip'

export default Tip
