import { motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../actions/commandUniverseNavigate'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from '../../actions/saveSelectionOffsets'
import { showPinnedCommandTooltipActionCreator as showPinnedCommandTooltip } from '../../actions/showPinnedCommandTooltip'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import { commandById } from '../../commands'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import useBreakpoint from '../../hooks/useBreakpoint'
import durations from '../../util/durations'
import haptics from '../../util/haptics'
import PinnedCommandIcon from './PinnedCommandIcon'
import PinnedCommandRing from './PinnedCommandRing'
import PinnedCommandTooltip from './PinnedCommandTooltip'

/**
 * The persistent bottom-right widget showing the pinned command's icon inside its practice ring. Renders nothing when
 * no command is pinned. Its ring opens the expanded gesture without executing the command.
 */
const PinnedCommand = () => {
  const dispatch = useDispatch()
  const tooltipId = useId()
  const [keepRaisedDuringExit, setKeepRaisedDuringExit] = useState(false)
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
  // The pinned command's practice record: how many reps the user has done and how many the ring is aiming for.
  const progressRecord = useSelector(state => (pinnedCommandId ? state.learning.progress[pinnedCommandId] : undefined))
  // Reps completed so far.
  const reps = progressRecord?.reps ?? 0
  // Reps needed to fill the ring, captured when the command was pinned.
  const targetReps = progressRecord?.targetReps ?? 0
  // Fraction of the ring to fill, from 0 to 1. Reps past the target keep the ring full.
  const progress = progressRecord ? Math.min(1, reps / targetReps) : 0
  // Notices each rep as it lands for the current pin, so the icon and the ring can celebrate it. `newReps` counts every
  // rep that lands and plays the icon's animation; `flourishes` counts those at or past the target and plays the ring's
  // flourish. Only a rise in the current pin's reps counts, so reps already saved when the widget mounts, or when a
  // command is pinned, never celebrate.
  const [newReps, setNewReps] = useState(0)
  const [flourishes, setFlourishes] = useState(0)
  const previousReps = useRef({ pinnedCommandId, reps })

  useEffect(() => {
    const previous = previousReps.current
    previousReps.current = { pinnedCommandId, reps }
    if (previous.pinnedCommandId !== pinnedCommandId || reps <= previous.reps) return
    setNewReps(count => count + 1)
    if (reps >= targetReps) setFlourishes(count => count + 1)
  }, [pinnedCommandId, reps, targetReps])

  // Changing the pinned command also closes the tooltip for any previous pinned command that might be open.
  const isOpen = useSelector(state => state.showPinnedCommandTooltip && !!state.learning.pinnedCommandId)
  const isRingRaised = isOpen || keepRaisedDuringExit

  // Close the tooltip when this widget disappears. A modal (such as Settings) replaces the widget while it is open, and
  // the tooltip should not reappear when the modal closes.
  useEffect(() => {
    return () => {
      dispatch(showPinnedCommandTooltip({ value: false }))
    }
  }, [dispatch])

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
      if (event.key === 'Escape') dispatch(showPinnedCommandTooltip({ value: false }))
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, isOpen])

  if (!pinnedCommandId) return null

  const command = commandById(pinnedCommandId)
  // A stored command may have been removed since the last app version.
  if (!command) return null

  /** Open the registered Command Universe detail page for this command. */
  const revealCommand = () => {
    dispatch(showPinnedCommandTooltip({ value: false }))
    dispatch(toggleMobileCommandUniverse({ value: true, preserveSelectionOffsets: true }))
    dispatch(commandUniverseNavigate('detail', { command }, { transition: 'none' }))
  }

  return (
    <>
      {/* Fixed to the screen corner, so the ring stays put however the page scrolls, including over the footer at the end of the page. It sits on the pinnedCommand layer just above the NavBar, and rises above the tooltip's surface while that is open or fading out. Position lives here; scale and lift stay on the button. */}
      <div
        className={css({
          position: 'fixed',
          right: 0,
          // The ring center sits 13.5px above the NavBar's bottom edge; its box center is 36.16px above its bottom.
          bottom: 'calc(max(11px, token(spacing.safeAreaBottom)) - 22.5px)',
          zIndex: isRingRaised ? 'pinnedCommandExpanded' : 'pinnedCommand',
          pointerEvents: 'none',
        })}
      >
        <motion.button
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
            dispatch(showPinnedCommandTooltip({ value: true }))
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
          <PinnedCommandRing
            key={pinnedCommandId}
            progress={progress}
            flourish={flourishes}
            activeOpacity={tooltipOpacity}
          >
            <PinnedCommandIcon command={command} repCount={newReps} />
          </PinnedCommandRing>
        </motion.button>
      </div>
      <PinnedCommandTooltip
        id={tooltipId}
        command={command}
        isOpen={isOpen}
        onClose={() => dispatch(showPinnedCommandTooltip({ value: false }))}
        onOpacityChange={handleTooltipOpacityChange}
        onReveal={revealCommand}
      />
    </>
  )
}

export default PinnedCommand
