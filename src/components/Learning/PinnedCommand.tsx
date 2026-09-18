import { motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import CommandId from '../../@types/CommandId'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../actions/commandUniverseNavigate'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from '../../actions/saveSelectionOffsets'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import { commandById } from '../../commands'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import useBreakpoint from '../../hooks/useBreakpoint'
import pinnedCommandStore from '../../stores/pinnedCommand'
import durations from '../../util/durations'
import haptics from '../../util/haptics'
import SettingsIcon from '../icons/SettingsIcon'
import PinnedCommandRing from './PinnedCommandRing'
import PinnedCommandTooltip from './PinnedCommandTooltip'

/**
 * The persistent bottom-right widget showing the pinned command's icon inside its practice ring. Renders nothing when
 * no command is pinned. Its ring opens the expanded gesture without executing the command.
 */
const PinnedCommand = () => {
  const dispatch = useDispatch()
  const tooltipId = useId()
  const [openedCommandId, setOpenedCommandId] = useState<CommandId | null>(null)
  const [keepRaisedDuringExit, setKeepRaisedDuringExit] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Whether the button had keyboard focus when it started moving to the other slot.
  const restoreFocus = useRef(false)
  // Tap and hold on the ring opens the command's detail page instead of the tooltip. The timer runs from pointerdown;
  // held records that it fired so the click that follows the release does not also open the tooltip.
  const holdTimer = useRef<number | undefined>(undefined)
  const held = useRef(false)
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])
  const isBottomRight = useBreakpoint('lg')
  const tooltipOpacity = useMotionValue(0)
  const ringScale = useTransform(tooltipOpacity, opacity => 1 + opacity * 0.25)
  // Keep the ring's center aligned with the tooltip row as it grows. CSS resolves rem and safe-area units;
  // Motion supplies the animated opacity and scale directly, as CommandCenter does for its animated mask.
  const surfaceBottomPadding = isBottomRight ? '1.5rem' : 'max(1.5rem, 0.5rem + env(safe-area-inset-bottom))'
  const ringTransform = useMotionTemplate`translateY(calc(${tooltipOpacity} * (max(11px, env(safe-area-inset-bottom)) + 36.84px * 1.25 - 22.5px - (${surfaceBottomPadding} + max(0px, 0.75rem - env(safe-area-inset-bottom)) + 3rem / 2 + 0.3889rem)))) scale(${ringScale})`
  const handleTooltipOpacityChange = useCallback((opacity: number) => tooltipOpacity.set(opacity), [tooltipOpacity])
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
  const progressRecord = useSelector(state => (pinnedCommandId ? state.learning.progress[pinnedCommandId] : undefined))
  const reps = progressRecord?.reps ?? 0
  const targetReps = progressRecord?.targetReps ?? 0
  const progress = progressRecord ? Math.min(1, reps / targetReps) : 0
  // Counts the reps earned locally at or past the target for the current pin; each one plays the ring's flourish.
  // Progress loaded from storage or shown after repinning does not, so the counter is keyed to the pin.
  const [flourish, setFlourish] = useState(0)
  const previousReps = useRef({ pinnedCommandId, reps })
  // Each awarded rep plays the command's icon animation, as the toolbar does on activation. Like the toolbar, a
  // toggle command that has just been switched off does not animate.
  const [isIconAnimated, setIsIconAnimated] = useState(false)
  // Remounting the icon on each rep restarts the animation when a rep lands while the previous one is still playing.
  const [iconAnimationKey, setIconAnimationKey] = useState(0)
  const isCommandActive = useSelector(state => {
    const pinned = pinnedCommandId ? commandById(pinnedCommandId) : null
    return !pinned?.isActive || pinned.isActive(state)
  })

  useEffect(() => {
    const previous = previousReps.current
    previousReps.current = { pinnedCommandId, reps }
    if (previous.pinnedCommandId !== pinnedCommandId || reps <= previous.reps) return
    setIsIconAnimated(isCommandActive)
    setIconAnimationKey(key => key + 1)
    // A rep earned while the tooltip is open means the user traced the gesture it was showing; the tooltip has done
    // its job, so close it. The rep itself is already counted.
    setOpenedCommandId(null)
    if (reps >= targetReps) setFlourish(count => count + 1)
  }, [pinnedCommandId, reps, targetReps, isCommandActive])

  const isOpen = !!pinnedCommandId && openedCommandId === pinnedCommandId
  const isRingRaised = isOpen || keepRaisedDuringExit

  // Publish the open state for the gesture handlers, which keep the gesture menu closed over an open tooltip.
  useEffect(() => {
    pinnedCommandStore.update({ tooltipOpen: isOpen })
    return () => pinnedCommandStore.update({ tooltipOpen: false })
  }, [isOpen])

  // The ring remounts when it changes slot; give focus back to it if it had focus before the move.
  useEffect(() => {
    if (!restoreFocus.current) return
    restoreFocus.current = false
    buttonRef.current?.focus({ preventScroll: true })
  }, [isRingRaised])

  useEffect(() => {
    if (isOpen) {
      if (!keepRaisedDuringExit) setKeepRaisedDuringExit(true)
      return
    }
    if (!keepRaisedDuringExit) return

    const timeout = window.setTimeout(() => setKeepRaisedDuringExit(false), durations.get('medium'))
    return () => window.clearTimeout(timeout)
  }, [isOpen, keepRaisedDuringExit])

  useEffect(() => {
    if (!isOpen) return

    /** Dismiss the expanded gesture through the keyboard without changing the pin. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        restoreFocus.current = document.activeElement === buttonRef.current
        setOpenedCommandId(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!pinnedCommandId) return null

  const command = commandById(pinnedCommandId)
  // A stored command may have been removed since the last app version.
  if (!command) return null
  const Icon = command.svg ?? SettingsIcon

  /** Open the registered Command Universe detail page for this command. */
  const revealCommand = () => {
    setOpenedCommandId(null)
    dispatch(toggleMobileCommandUniverse({ value: true, preserveSelectionOffsets: true }))
    dispatch(commandUniverseNavigate('detail', { command }, { transition: 'none' }))
  }

  /**
   * The ring lives in one of two slots. Docked, it sits in a sticky wrapper in the page flow so it rides the NavBar
   * row, including when the footer pushes that row up at the end of the page. Raised, it moves to a fixed slot at the
   * same offset so it stays docked in the overlay however the page scrolls. The shared layoutId animates the ring
   * between wherever the sticky slot currently is and the fixed slot, in both directions. Position lives on this
   * outer element; scale and lift stay on the button so the layout animation and the enlargement do not share a
   * transform.
   */
  const ring = (
    <motion.div
      layoutId='pinned-command-ring'
      layout='position'
      transition={{ layout: { duration: durations.get('medium') / 1000, ease: 'easeOut' } }}
      className={css({
        position: 'absolute',
        right: 0,
        // The ring center sits 13.5px above the NavBar's bottom edge; its box center is 36.16px above its bottom.
        bottom: '-22.5px',
      })}
    >
      <motion.button
        ref={buttonRef}
        type='button'
        aria-label={`Show gesture for ${command.label}`}
        aria-description={
          progressRecord
            ? `Practice progress: ${Math.min(reps, targetReps)} of ${targetReps} repetitions`
            : 'Practice progress unavailable'
        }
        aria-expanded={isOpen}
        aria-controls={tooltipId}
        data-testid='pinned-command'
        onPointerDown={event => {
          // Record the editor selection before focusing an interactive control in the corner.
          dispatch(saveSelectionOffsets())
          event.preventDefault()
          held.current = false
          window.clearTimeout(holdTimer.current)
          holdTimer.current = window.setTimeout(() => {
            held.current = true
            haptics.light()
            revealCommand()
          }, TIMEOUT_LONG_PRESS_THOUGHT)
        }}
        onPointerUp={() => window.clearTimeout(holdTimer.current)}
        onPointerCancel={() => window.clearTimeout(holdTimer.current)}
        onPointerLeave={() => window.clearTimeout(holdTimer.current)}
        // The hold is em's own; keep the platform's long-press menu out of it.
        onContextMenu={event => event.preventDefault()}
        onClick={event => {
          if (held.current) {
            held.current = false
            return
          }
          // Keyboard activation has no pointerdown; clear any stale snapshot before opening.
          if (event.detail === 0) dispatch(saveSelectionOffsets())
          // The button remounts in the other slot; carry keyboard focus across with it.
          restoreFocus.current = document.activeElement === event.currentTarget
          setOpenedCommandId(pinnedCommandId)
        }}
        className={css({
          display: 'block',
          position: 'relative',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          transformOrigin: 'right bottom',
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          pointerEvents: 'auto',
          // The ring fills only the middle 44px of its 73px box, and the box already reaches the right edge and
          // the floor, so a forgiving tap target grows upward and leftward. Extending the hit area on a
          // pseudo-element leaves the box, and so the ring's placement and scale origin, unchanged.
          // PINNED_COMMAND_RESERVED_WIDTH keeps the NavBar's breadcrumbs clear of the extra width.
          _before: {
            content: '""',
            position: 'absolute',
            top: '-16px',
            left: '-12px',
            right: 0,
            bottom: 0,
          },
        })}
        style={{
          transform: ringTransform,
          // The enlarged ring overlaps Clear on desktop; let that control remain tappable.
          pointerEvents: isRingRaised ? 'none' : undefined,
        }}
      >
        <PinnedCommandRing key={pinnedCommandId} progress={progress} flourish={flourish} activeOpacity={tooltipOpacity}>
          <Icon
            key={iconAnimationKey}
            size={14}
            fill={token('colors.gray50')}
            cssRaw={css.raw({ flex: 'none' })}
            animated={isIconAnimated}
            animationComplete={() => setIsIconAnimated(false)}
          />
        </PinnedCommandRing>
      </motion.button>
    </motion.div>
  )

  return (
    <>
      {/* Docked slot: stays in the layout as a zero-height placeholder while the ring is raised, so the close animation has a target and the NavBar's reserved width does not change. */}
      <div
        className={css({
          position: 'sticky',
          // Match the NavBar's bottom edge without adding height before the footer.
          bottom: 'calc(max(11px, token(spacing.safeAreaBottom)))',
          height: 0,
          zIndex: 'pinnedCommand',
          pointerEvents: 'none',
        })}
      >
        {!isRingRaised && ring}
      </div>
      {createPortal(
        <>
          {/* Raised slot: the docked slot's geometry, fixed to the viewport beside the overlay. */}
          {isRingRaised && (
            <div
              className={css({
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 'calc(max(11px, token(spacing.safeAreaBottom)))',
                height: 0,
                zIndex: 'pinnedCommandExpanded',
                pointerEvents: 'none',
              })}
            >
              {ring}
            </div>
          )}
          <PinnedCommandTooltip
            id={tooltipId}
            command={command}
            isOpen={isOpen}
            onClose={() => setOpenedCommandId(null)}
            onOpacityChange={handleTooltipOpacityChange}
            onReveal={revealCommand}
          />
        </>,
        document.body,
      )}
    </>
  )
}

export default PinnedCommand
