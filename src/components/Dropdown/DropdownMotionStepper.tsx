// PROTOTYPE — the Motion section's controls for the design-dials frame stepper (see useMotionStepper), delete with
// DropdownDebugPanel once the motion is settled.
import { ComponentType } from 'react'
import { css } from '../../../styled-system/css'
import { FRAME_MS, MotionStepper, RATES, Status } from './useMotionStepper'

/** The props of the panel's precision slider, which the stepper reuses for its scrubber. */
interface SliderProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number, decimals: number) => void
}

const bigButton = css({
  flex: 1,
  minWidth: '44px',
  height: '44px',
  padding: '0 6px',
  fontSize: '16px',
  fontFamily: 'inherit',
  color: 'fg',
  backgroundColor: 'fgOverlay10',
  border: '1px solid {colors.fgOverlay20}',
  borderRadius: '8px',
  cursor: 'pointer',
  _disabled: { opacity: 0.35, cursor: 'default' },
})

/** A large on/off row for the freeze toggles. */
const Toggle = ({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) => (
  <button
    type='button'
    aria-pressed={on}
    onClick={() => onChange(!on)}
    className={css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      minHeight: '40px',
      marginBottom: '6px',
      padding: '0 10px',
      fontSize: '13px',
      fontFamily: 'inherit',
      color: 'fg',
      backgroundColor: 'fgOverlay10',
      border: '1px solid {colors.fgOverlay20}',
      borderRadius: '8px',
      cursor: 'pointer',
    })}
    style={on ? { backgroundColor: 'rgba(120, 105, 225, 0.45)', borderColor: 'rgba(170, 160, 255, 0.8)' } : undefined}
  >
    <span>{label}</span>
    <span>{on ? 'on' : 'off'}</span>
  </button>
)

/** What the stepper is doing, in words. */
const STATUS_TEXT: Record<Status, string> = {
  idle: 'Nothing held. Turn on a freeze, then open or close the menu.',
  capturing: 'Catching the transitions…',
  frozen: 'Frozen',
  playing: 'Playing',
  empty: 'No transitions started. Try again.',
}

/** The Motion section's controls: the freeze toggles, a scrubber, frame steps and playback. */
const MotionStepperControls = ({
  motion,
  Slider,
}: {
  motion: MotionStepper
  /** The panel's precision slider, so the scrubber scrubs finer as the finger moves away from it. */
  Slider: ComponentType<SliderProps>
}) => {
  const held = motion.status === 'frozen' || motion.status === 'playing'
  const frames = Math.ceil(motion.duration / FRAME_MS)
  return (
    <div className={css({ marginBottom: '6px' })}>
      <p className={css({ margin: '0 0 6px', opacity: 0.6 })}>
        Holds the menu&apos;s CSS transitions at their first frame so you can step through them. Only CSS transitions
        are held: React&apos;s phase switches, the close timer that unmounts the layers, and the delayed sort run on
        their own clock.
      </p>
      <Toggle label='Freeze on open' on={motion.freezeOnOpen} onChange={motion.setFreezeOnOpen} />
      <Toggle label='Freeze on close' on={motion.freezeOnClose} onChange={motion.setFreezeOnClose} />
      <p className={css({ margin: '4px 0', opacity: 0.75 })}>
        {STATUS_TEXT[motion.status]}
        {held ? ` · ${motion.count} transitions` : ''}
      </p>
      {held ? (
        <>
          <Slider
            value={motion.time}
            min={0}
            max={Math.max(motion.duration, FRAME_MS)}
            step={FRAME_MS}
            onChange={value => motion.seek(value)}
          />
          <p className={css({ margin: '2px 0 6px', fontVariantNumeric: 'tabular-nums' })}>
            {motion.time.toFixed(1)} ms · frame {Math.round(motion.time / FRAME_MS)} / {frames}
          </p>
          <div className={css({ display: 'flex', gap: '6px', marginBottom: '6px' })}>
            <button
              type='button'
              aria-label='To the start'
              title='To the start'
              onClick={() => motion.seek(0)}
              className={bigButton}
            >
              ⏮
            </button>
            <button
              type='button'
              aria-label='Back one frame'
              title='Back one frame'
              onClick={() => motion.step(-1)}
              className={bigButton}
            >
              ◀
            </button>
            {motion.status === 'playing' ? (
              <button type='button' aria-label='Pause' title='Pause' onClick={motion.pause} className={bigButton}>
                ⏸
              </button>
            ) : (
              <button type='button' aria-label='Play' title='Play' onClick={motion.play} className={bigButton}>
                ▶︎
              </button>
            )}
            <button
              type='button'
              aria-label='Forward one frame'
              title='Forward one frame'
              onClick={() => motion.step(1)}
              className={bigButton}
            >
              ▶
            </button>
            <button
              type='button'
              aria-label='To the end'
              title='To the end'
              onClick={() => motion.seek(motion.duration)}
              className={bigButton}
            >
              ⏭
            </button>
          </div>
          <div className={css({ display: 'flex', gap: '6px', marginBottom: '6px' })}>
            {RATES.map(({ rate, label }) => (
              <button
                key={rate}
                type='button'
                aria-pressed={motion.rate === rate}
                aria-label={`Play at ${label}`}
                onClick={() => motion.setRate(rate)}
                className={bigButton}
                style={
                  motion.rate === rate
                    ? { backgroundColor: 'rgba(120, 105, 225, 0.45)', borderColor: 'rgba(170, 160, 255, 0.8)' }
                    : undefined
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button type='button' onClick={motion.release} className={bigButton} style={{ width: '100%' }}>
            Release (let it finish)
          </button>
        </>
      ) : (
        <button type='button' onClick={motion.freezeNow} className={bigButton} style={{ width: '100%' }}>
          Freeze now
        </button>
      )}
    </div>
  )
}

export default MotionStepperControls
