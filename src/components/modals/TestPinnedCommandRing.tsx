import { useMotionValue } from 'framer-motion'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import PinnedCommandRing from '../Learning/PinnedCommandRing'
import ContextViewIcon from '../icons/ContextViewIcon'
import ModalComponent from './ModalComponent'

/** Ring states covered by the snapshot: empty, partial fills including the Figma export's 63.5%, full mono, and full colorful. */
const STATES: { label: string; progress: number; colorful?: boolean }[] = [
  { label: '0%', progress: 0 },
  { label: '30%', progress: 0.3 },
  { label: '64%', progress: 0.635 },
  { label: '90%', progress: 0.9 },
  { label: '100%', progress: 1 },
  { label: '100% color', progress: 1, colorful: true },
]

/** Modal used for the PinnedCommandRing snapshot test. */
const ModalTestPinnedCommandRing = () => {
  // Supply a fixed color opacity so this visual fixture does not depend on interactions or animation timing.
  const activeOpacity = useMotionValue(1)

  return (
    <ModalComponent id='testPinnedCommandRing' hideClose={true}>
      <div
        className={css({ display: 'flex', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'black', padding: '1rem' })}
      >
        {STATES.map(state => (
          <figure
            key={state.label}
            className={css({ margin: 0, display: 'grid', justifyItems: 'center', gap: '0.25rem' })}
          >
            <PinnedCommandRing progress={state.progress} activeOpacity={state.colorful ? activeOpacity : undefined}>
              <ContextViewIcon size={14} fill={token('colors.gray50')} cssRaw={css.raw({ flex: 'none' })} />
            </PinnedCommandRing>
            <figcaption className={css({ fontSize: '0.7rem', color: 'gray50' })}>{state.label}</figcaption>
          </figure>
        ))}
      </div>
    </ModalComponent>
  )
}

export default ModalTestPinnedCommandRing
