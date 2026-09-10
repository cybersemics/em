import { Transition } from 'motion/react'
import { css } from '../../../styled-system/css'
import commandUniverseMotion from '../CommandUniverse/commandUniverseMotion'

/** Optional development controls. They edit the same motion inputs consumed by the production transition view. */
const CommandUniverseDebug = ({
  value,
  onChange,
  disabled,
}: {
  value: Transition
  onChange: (value: Transition) => void
  disabled: boolean
}) => (
  <details
    className={css({
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: 100001,
      background: 'bg',
      color: 'fg',
      border: '1px solid {colors.fgOverlay20}',
      borderRadius: '8px',
      padding: '0.5rem',
      fontSize: '12px',
    })}
  >
    <summary>Motion settings</summary>
    <fieldset
      disabled={disabled}
      className={css({ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: 'none', padding: '0.5rem' })}
    >
      <label>
        Duration ({Math.round((value.duration ?? 0) * 1000)} ms)
        <input
          aria-label='Zoom duration'
          type='range'
          min={0}
          max={2500}
          step={50}
          value={(value.duration ?? 0) * 1000}
          onChange={event => onChange({ ...value, duration: +event.currentTarget.value / 1000 })}
        />
      </label>
      <label>
        Easing
        <select
          value={Array.isArray(value.ease) ? 'current' : (value.ease as string)}
          onChange={event =>
            onChange({
              ...value,
              ease:
                event.currentTarget.value === 'current'
                  ? commandUniverseMotion.ease
                  : (event.currentTarget.value as 'easeInOut' | 'easeOut' | 'linear'),
            })
          }
        >
          <option value='current'>Current curve</option>
          <option value='easeInOut'>Ease in/out</option>
          <option value='easeOut'>Ease out</option>
          <option value='linear'>Linear</option>
        </select>
      </label>
    </fieldset>
  </details>
)

export default CommandUniverseDebug
