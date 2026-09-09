import { delay } from 'motion'
import { motion } from 'motion/react'
import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import CommandSortType from '../@types/CommandSortType'
import useOnClickOutside from '../hooks/useOnClickOutside'
import durations from '../util/durations'
import AToZIcon from './icons/AToZIcon'
import CommandsListIcon from './icons/CommandsListIcon'

interface CommandUniverseSortButtonProps {
  onSortChange: (sortOrder: CommandSortType) => void
}

/** Toggles the sort order and coordinates its tooltip with a mask over the adjacent search input. */
const CommandUniverseSortButton = ({ children, onSortChange }: PropsWithChildren<CommandUniverseSortButtonProps>) => {
  const [selectedSort, setSelectedSort] = useState<CommandSortType>('type')
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useOnClickOutside(buttonRef, () => setTooltipVisible(false))

  useEffect(() => {
    if (!tooltipVisible) return
    return delay(() => setTooltipVisible(false), durations.get('sortTooltipHold') / 1000)
  }, [tooltipVisible, selectedSort])

  /** Updates the list immediately and restarts the tooltip timeout on each tap. */
  const toggleSort = () => {
    const next = selectedSort === 'type' ? 'alphabetical' : 'type'
    setSelectedSort(next)
    setTooltipVisible(true)
    onSortChange(next)
  }

  const enter = { duration: durations.get('medium') / 1000, ease: [0.4, 0, 0.2, 1] as const }
  const exit = { duration: durations.get('medium') / 1000, ease: [0.16, 1, 0.3, 1] as const }
  const crossfade = { duration: durations.get('medium') / 1000, ease: 'easeInOut' as const }
  const glowFade = { duration: durations.get(tooltipVisible ? 'fast' : 'medium') / 1000, ease: 'easeOut' as const }
  const valueLayer = css({ position: 'absolute', inset: 0, textAlign: 'right' })
  const iconLayer = css({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Override the shared icon recipe so Motion owns the color animation and sizing stays fixed.
    '& > svg': { flex: 'none', transition: 'none' },
  })

  return (
    <motion.div
      initial={false}
      animate={tooltipVisible ? 'visible' : 'hidden'}
      className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        paddingInline: '1rem',
        paddingBlock: '0.5rem',
      })}
    >
      {/* Motion interpolates the gradient stops without rerendering the command list each frame. */}
      <motion.div
        className={css({ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center' })}
        variants={{
          hidden: {
            maskImage: 'linear-gradient(to right, black calc(100% - 1.5rem), transparent calc(100% - 0rem))',
          },
          visible: {
            maskImage: 'linear-gradient(to right, black calc(100% - 10rem), transparent calc(100% - 5rem))',
          },
        }}
        transition={glowFade}
      >
        {children}
      </motion.div>
      <div className={css({ position: 'relative', flex: 'none', width: '28px', height: '28px' })}>
        {/* Keep the glow outside the text's blending group so it blends with the dialog. */}
        <motion.div
          aria-hidden
          data-testid='sort-toggle-glow'
          className={css({
            position: 'absolute',
            top: '50%',
            right: '100%',
            marginRight: '0.5rem',
            width: '21.25rem',
            height: '8.25rem',
            backgroundImage: 'url(/img/dialog/toggle-option-glow.avif)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            mixBlendMode: 'hard-light',
            transformOrigin: 'right center',
            maskImage: 'linear-gradient(to right, transparent 0, black 3.25rem, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 3.25rem, black 100%)',
          })}
          style={{ y: '-50%' }}
          variants={{
            hidden: { opacity: 0, x: '4.725rem', scale: 0.9, transition: { ...exit, opacity: glowFade } },
            visible: { opacity: 1, x: '5.25rem', scale: 1, transition: { ...enter, opacity: glowFade } },
          }}
        />
        <motion.div
          aria-hidden
          className={css({
            position: 'absolute',
            right: '100%',
            top: '50%',
            marginRight: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            whiteSpace: 'nowrap',
            mixBlendMode: 'plus-lighter',
            fontFamily: '"Radio Canada Big", sans-serif',
            transformOrigin: 'right center',
            userSelect: 'none',
          })}
          style={{ y: '-50%', pointerEvents: tooltipVisible ? 'auto' : 'none' }}
          variants={{ hidden: { scale: 0.9, transition: exit }, visible: { scale: 1, transition: enter } }}
        >
          <motion.span
            className={css({
              color: 'white',
              fontSize: '0.65rem',
              lineHeight: 1.25,
              fontWeight: 400,
              letterSpacing: '0.02em',
            })}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 0.5 } }}
            transition={enter}
          >
            Sort by
          </motion.span>
          <motion.span
            className={css({
              position: 'relative',
              display: 'inline-block',
              color: 'white',
              fontSize: '0.8rem',
              lineHeight: 1.2,
              fontWeight: 500,
              letterSpacing: '-0.004em',
            })}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={crossfade}
          >
            {/* Reserve the longer label's width so switching does not move the tooltip. */}
            <span className={css({ visibility: 'hidden' })}>Alphabetical</span>
            <motion.span
              initial={false}
              animate={{ opacity: selectedSort === 'type' ? 1 : 0 }}
              transition={crossfade}
              className={valueLayer}
            >
              Type
            </motion.span>
            <motion.span
              initial={false}
              animate={{ opacity: selectedSort === 'alphabetical' ? 1 : 0 }}
              transition={crossfade}
              className={valueLayer}
            >
              Alphabetical
            </motion.span>
          </motion.span>
        </motion.div>
        <motion.button
          ref={buttonRef}
          type='button'
          aria-label={`Sort commands by ${selectedSort}. Tap to toggle.`}
          onClick={toggleSort}
          variants={{
            hidden: { opacity: 0.5, color: token('colors.dialogSortIcon'), transition: exit },
            visible: { opacity: 1, color: token('colors.white'), transition: enter },
          }}
          className={css({
            position: 'relative',
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            width: '28px',
            height: '28px',
            mixBlendMode: 'plus-lighter',
            // Avoid native iOS press flashes showing through the blend.
            WebkitTapHighlightColor: 'transparent',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitAppearance: 'none',
            appearance: 'none',
            _active: { background: 'transparent' },
          })}
        >
          <motion.span
            initial={false}
            animate={{ opacity: selectedSort === 'type' ? 1 : 0 }}
            transition={crossfade}
            className={iconLayer}
          >
            <CommandsListIcon size={28} fill='currentColor' strokeWidth={0} />
          </motion.span>
          <motion.span
            initial={false}
            animate={{ opacity: selectedSort === 'alphabetical' ? 1 : 0 }}
            transition={crossfade}
            className={iconLayer}
          >
            <AToZIcon size={28} fill='currentColor' strokeWidth={0} />
          </motion.span>
        </motion.button>
      </div>
    </motion.div>
  )
}

export default CommandUniverseSortButton
