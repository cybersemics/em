import { FC, PropsWithChildren } from 'react'

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
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
        transform: display ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 200ms ease-in-out, opacity 200ms ease-in-out',
        opacity: display ? 1 : 0,
      }}
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
