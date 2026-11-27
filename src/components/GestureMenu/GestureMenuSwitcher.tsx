import { FC, useEffect, useRef } from 'react'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import gestureMenuSwitchStore from '../../stores/gestureMenuSwitchStore'

/** The two states the switcher chooses between. */
const OPTIONS = [
  { enabled: true, label: 'Gesture Menu' },
  { enabled: false, label: 'No Gesture Menu' },
] as const

/** A pill row pinned near the top of the screen that turns the Gesture Menu on or off. Hidden from e2e runs so that snapshots never include it. */
const GestureMenuSwitcher: FC = () => {
  const enabled = gestureMenuSwitchStore.useSelector(state => state.enabled)
  const ref = useRef<HTMLDivElement>(null)

  // MultiGesture listens for touchstart and mousedown natively, so a tap on the switcher must not reach it.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    /** Stops the event from reaching the app's native listeners. */
    const stop = (e: Event) => e.stopPropagation()
    el.addEventListener('touchstart', stop)
    el.addEventListener('mousedown', stop)
    return () => {
      el.removeEventListener('touchstart', stop)
      el.removeEventListener('mousedown', stop)
    }
  }, [])

  if (navigator.webdriver) return null

  return (
    <div
      ref={ref}
      className={css({
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 3.5rem)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '2px',
        padding: '3px',
        borderRadius: '999px',
        background: 'bgOverlay80',
        border: '1px solid',
        borderColor: 'fgOverlay20',
        fontSize: '12px',
        whiteSpace: 'nowrap',
      })}
      style={{ zIndex: 100000 }}
    >
      {OPTIONS.map(({ enabled: option, label }) => (
        <button
          key={label}
          onClick={() => gestureMenuSwitchStore.update({ enabled: option })}
          className={css({
            all: 'unset',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '999px',
            color: 'fg',
          })}
          style={{ background: option === enabled ? token('colors.fgOverlay20') : 'transparent' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default GestureMenuSwitcher
