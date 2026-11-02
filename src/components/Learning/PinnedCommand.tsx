import { motion, useMotionValue } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../actions/commandUniverseNavigate'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from '../../actions/saveSelectionOffsets'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import { commandById } from '../../commands'
import PinnedCommandIcon from './PinnedCommandIcon'
import PinnedCommandRing from './PinnedCommandRing'
import PinnedCommandTooltip from './PinnedCommandTooltip'
import usePinnedCommandTooltip from './usePinnedCommandTooltip'
import useRingExpansion from './useRingExpansion'
import useRingHold from './useRingHold'

/**
 * The persistent bottom-right widget showing the pinned command's icon inside its practice ring. Renders nothing when
 * no command is pinned. Tapping the ring opens or closes the command's gesture tooltip, and holding it opens the
 * command's Command Universe detail page; neither executes the command.
 *
 * The component renders the ring and the tooltip and notices reps as they land. The animations belong to hooks and
 * components of their own: useRingExpansion grows the ring into the tooltip, PinnedCommandRing animates the fill and
 * the flourish, and PinnedCommandIcon plays the icon animation.
 */
const PinnedCommand = () => {
  const dispatch = useDispatch()
  const tooltipId = useId()
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
  const command = pinnedCommandId ? commandById(pinnedCommandId) : undefined
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

  const { isOpen, close, toggle } = usePinnedCommandTooltip({ reps })
  // The pinned command stays visible over the Mobile Command Universe, the dialog the user pins from, by keeping the
  // ring on its raised layer there. Under every other overlay it stays docked beneath.
  const inCommandUniverse = useSelector(state => !!state.showMobileCommandUniverse)
  // The ring's fixed dock in the corner, and the ring button inside it.
  const dockRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLButtonElement>(null)
  // The tooltip's row of genie and text, which the expanded ring lines up with.
  const rowRef = useRef<HTMLDivElement>(null)
  // The tooltip surface's opacity, which the ring's expansion and color follow.
  const tooltipOpacity = useMotionValue(0)
  const handleTooltipOpacityChange = useCallback((opacity: number) => tooltipOpacity.set(opacity), [tooltipOpacity])
  const { transform, isRaised, ringFootprint } = useRingExpansion({ isOpen, tooltipOpacity, dockRef, rowRef })

  /** Opens the registered Command Universe detail page for this command. */
  const revealCommand = useCallback(() => {
    if (!command) return
    close()
    dispatch(toggleMobileCommandUniverse({ value: true, preserveSelectionOffsets: true }))
    dispatch(commandUniverseNavigate('detail', { command }, { transition: 'none' }))
  }, [close, command, dispatch])
  const hold = useRingHold(revealCommand)

  // A stored command may have been removed since the last app version.
  if (!command) return null

  return (
    // The Mobile Command Universe closes on a press outside it. A press on the pinned command, which is layered above
    // it, is not outside it.
    <div data-above-dialog>
      {/* Rendered before the ring, which shares its layer while raised and must paint on top of it. */}
      <PinnedCommandTooltip
        id={tooltipId}
        command={command}
        isOpen={isOpen}
        onClose={close}
        onOpacityChange={handleTooltipOpacityChange}
        onReveal={revealCommand}
        ringRef={ringRef}
        rowRef={rowRef}
        ringFootprint={ringFootprint}
      />
      {/* Fixed to the screen corner, so the ring stays put however the page scrolls, including over the footer at the end of the page. It sits on the pinnedCommand layer just above the NavBar, and rises above the tooltip's surface while that is visible. Position lives here; scale and lift stay on the button. */}
      <div
        ref={dockRef}
        className={css({
          position: 'fixed',
          right: 0,
          // The ring center sits 13.5px above the NavBar's bottom edge; its box center is 36.16px above its bottom.
          bottom: 'calc(max(11px, token(spacing.safeAreaBottom)) - 22.5px)',
          zIndex: isRaised || inCommandUniverse ? 'pinnedCommandExpanded' : 'pinnedCommand',
          pointerEvents: 'none',
        })}
      >
        <motion.button
          ref={ringRef}
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
            hold.start()
          }}
          onPointerUp={hold.cancel}
          onPointerCancel={hold.cancel}
          onPointerLeave={hold.cancel}
          // The hold is em's own; keep the platform's long-press menu out of it.
          onContextMenu={event => event.preventDefault()}
          onClick={event => {
            if (hold.consumeHold()) return
            // Keyboard activation has no pointerdown; clear any stale snapshot before opening.
            if (event.detail === 0 && !inCommandUniverse) dispatch(saveSelectionOffsets())
            toggle()
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
          style={{ transform }}
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
    </div>
  )
}

export default PinnedCommand
