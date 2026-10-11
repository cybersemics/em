import { motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../actions/commandUniverseNavigate'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from '../../actions/saveSelectionOffsets'
import { showPinnedCommandTooltipActionCreator as showPinnedCommandTooltip } from '../../actions/showPinnedCommandTooltip'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import { commandById } from '../../commands'
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import useBreakpoint from '../../hooks/useBreakpoint'
import commandEmitter from '../../stores/commandEmitter'
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
    dispatch(showPinnedCommandTooltip({ value: false }))
    if (reps >= targetReps) setFlourish(count => count + 1)
  }, [dispatch, pinnedCommandId, reps, targetReps, isCommandActive])

  // Changing the pinned command also closes the tooltip for any previous pinned command that might be open.
  const isOpen = useSelector(state => state.showPinnedCommandTooltip && !!state.learning.pinnedCommandId)
  const isRingRaised = isOpen || keepRaisedDuringExit
  // The pinned command stays visible over the Mobile Command Universe, the dialog the user pins from, by keeping the
  // ring on its raised layer there. Under every other overlay it stays docked beneath.
  const inCommandUniverse = useSelector(state => !!state.showMobileCommandUniverse)
  // A dry run over the Command Universe earns no rep, so the ring bursts with color instead of filling. The gesture
  // handler announces each one on commandEmitter; the count only exists to tell the ring to play again.
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    /** Plays the ring's burst for a successful dry run. */
    const playBurst = () => setBurst(count => count + 1)
    commandEmitter.on('pinnedGestureDryRun', playBurst)
    return () => commandEmitter.off('pinnedGestureDryRun', playBurst)
  }, [])

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
  const Icon = command.svg ?? SettingsIcon

  /** Open the registered Command Universe detail page for this command. */
  const revealCommand = () => {
    dispatch(showPinnedCommandTooltip({ value: false }))
    dispatch(toggleMobileCommandUniverse({ value: true, preserveSelectionOffsets: true }))
    dispatch(commandUniverseNavigate('detail', { command }, { transition: 'none' }))
  }

  return (
    // The Mobile Command Universe closes on a press outside it. A press on the pinned command, which is layered above
    // it, is not outside it.
    <div data-above-dialog>
      {/* Rendered before the ring, which shares its layer while raised and must paint on top of it. */}
      <PinnedCommandTooltip
        id={tooltipId}
        command={command}
        isOpen={isOpen}
        onClose={() => dispatch(showPinnedCommandTooltip({ value: false }))}
        onOpacityChange={handleTooltipOpacityChange}
        onReveal={revealCommand}
      />
      {/* Fixed to the screen corner, so the ring stays put however the page scrolls, including over the footer at the end of the page. It sits on the pinnedCommand layer just above the NavBar, and rises above the tooltip's surface while that is open or fading out. Position lives here; scale and lift stay on the button. */}
      <div
        className={css({
          position: 'fixed',
          right: 0,
          // The ring center sits 13.5px above the NavBar's bottom edge; its box center is 36.16px above its bottom.
          bottom: 'calc(max(11px, token(spacing.safeAreaBottom)) - 22.5px)',
          zIndex: isRingRaised || inCommandUniverse ? 'pinnedCommandExpanded' : 'pinnedCommand',
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
            // Record the editor selection before focusing an interactive control in the corner. Over the Command
            // Universe the editor has no selection; the snapshot taken when the Command Universe opened must survive.
            if (!inCommandUniverse) dispatch(saveSelectionOffsets())
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
            if (event.detail === 0 && !inCommandUniverse) dispatch(saveSelectionOffsets())
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
            flourish={flourish}
            burst={burst}
            activeOpacity={tooltipOpacity}
          >
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
      </div>
    </div>
  )
}

export default PinnedCommand
