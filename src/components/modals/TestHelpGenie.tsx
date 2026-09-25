import { Suspense, lazy } from 'react'
import { css } from '../../../styled-system/css'
import ModalComponent from './ModalComponent'

// Lazy, as in HelpGenie: every modal is imported with the app, and Pixi must not be.
const GenieCanvas = lazy(() => import('../HelpGenie/GenieCanvas'))

/** Frames of a target held still at a point. */
const hold = (x: number, y: number, frames: number) => Array.from({ length: frames }, () => ({ x, y }))

/**
 * Poses covered by the snapshot, each a flight through targets (one per 60Hz frame) in a 300×220 box. Each starts
 * with a second at rest so the flight begins from a settled genie, and stops mid-flight where the shape is telling.
 * Sparkles come from a seeded sequence, so they are the same in every run.
 */
const POSES: { label: string; flight: { x: number; y: number }[] }[] = [
  { label: 'rest', flight: hold(150, 110, 60) },
  { label: 'straight', flight: [...hold(40, 110, 60), ...hold(270, 110, 16)] },
  {
    label: 'arc',
    flight: [
      ...hold(60, 180, 60),
      // A quarter turn, up and over to the right.
      ...Array.from({ length: 24 }, (_, i) => {
        const angle = Math.PI - (i / 23) * (Math.PI / 2)
        return { x: 150 + 100 * Math.cos(angle), y: 190 - 150 * Math.sin(angle) }
      }),
    ],
  },
  { label: 'reversal', flight: [...hold(40, 110, 60), ...hold(270, 110, 22), ...hold(60, 150, 10)] },
]

/** Modal used for the HelpGenie snapshot test. */
const ModalTestHelpGenie = () => (
  <ModalComponent id='testHelpGenie' hideClose={true}>
    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'black', padding: '1rem' })}>
      {POSES.map(pose => (
        <figure
          key={pose.label}
          className={css({ margin: 0, display: 'grid', justifyItems: 'center', gap: '0.25rem' })}
        >
          {/* The box owns the blend, as HelpGenie's overlay does in the app. */}
          <div
            className={css({
              position: 'relative',
              width: '300px',
              height: '220px',
              backgroundColor: 'black',
              mixBlendMode: 'screen',
            })}
          >
            <Suspense fallback={null}>
              <GenieCanvas flight={pose.flight} />
            </Suspense>
          </div>
          <figcaption className={css({ fontSize: '0.7rem', color: 'gray50' })}>{pose.label}</figcaption>
        </figure>
      ))}
    </div>
  </ModalComponent>
)

export default ModalTestHelpGenie
