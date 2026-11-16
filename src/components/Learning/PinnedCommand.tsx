import { animate, motion, useMotionValue, useSpring } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import CommandId from '../../@types/CommandId'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../actions/commandUniverseNavigate'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from '../../actions/saveSelectionOffsets'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import { commandById } from '../../commands'
import useCommandDrag, { DRAG_RING_SHIFT, MAGNET_RING_SHIFT_X } from '../../hooks/useCommandDrag'
import commandDragStore from '../../stores/commandDragStore'
import commandEmitter from '../../stores/commandEmitter'
import PinnedCommandIcon from './PinnedCommandIcon'
import PinnedCommandRing from './PinnedCommandRing'
import PinnedCommandTooltip from './PinnedCommandTooltip'
import pinnedCommandDock from './pinnedCommandDock'
import usePinnedCommandTooltip from './usePinnedCommandTooltip'
import useRingExpansion from './useRingExpansion'
import useRingHold from './useRingHold'

/**
 * How brightly the ring lights up while a command is dragged, from 0 (its resting look) to 1: as soon as the drag
 * starts, wherever the pointer is; as the pointer reaches the magnet; and once the command has popped in.
 */
const ILLUMINATION_FAR = 0.4
const ILLUMINATION_NEAR = 0.6
const ILLUMINATION_MAGNETIZED = 0.74
/** How much the ring grows while a command is dragged, and when the command pops into it, from the design. */
const DRAG_SCALE = 1.28
const MAGNET_SCALE = 1.57
/** The opacity of the pinned command's icon while another command, or the pinned command itself, is being dragged. */
const DRAG_ICON_OPACITY = 0.34

/**
 * The persistent bottom-right widget showing the pinned command's icon inside its practice ring. Renders nothing when
 * no command is pinned, except while a command is dragged from the Command Universe to pin it. Tapping the ring opens
 * or closes the command's gesture tooltip, and holding it opens the command's Command Universe detail page; neither
 * executes the command. Dragging out of it to the right edge unpins it (see useCommandDrag).
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
  // A drag to pin or unpin. Only its discrete changes render; its proximity drives the ring's opacity directly below.
  const dragSource = commandDragStore.useSelector(drag => drag?.source)
  const draggedCommandId = commandDragStore.useSelector(drag => drag?.commandId)
  const magnetized = commandDragStore.useSelector(drag => !!drag?.magnetized)
  // The command in the ring: a dragged command once it has popped in, otherwise the pin.
  const magnetCommand = magnetized && draggedCommandId ? commandById(draggedCommandId) : undefined
  const ringCommand = magnetCommand ?? command
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
  // It stays in view over Command Discovery too, where the genie lands in it.
  const inCommandDiscovery = useSelector(state => !!state.commandDiscovery)
  // A dry run over the Command Universe earns no rep, so the ring bursts with color instead of filling. The gesture
  // handler announces each one on commandEmitter; the count only exists to tell the ring to play again.
  const [burst, setBurst] = useState(0)
  // A command dropped into the ring plays the same burst, once, as the pulse that confirms the pin. A new pin remounts
  // the ring, which would mount with the burst already counted, so the pulse waits for the ring of the dropped command.
  const renderedPinId = useRef(pinnedCommandId)
  const pendingPulse = useRef<CommandId | null>(null)
  useEffect(() => {
    renderedPinId.current = pinnedCommandId
    if (!pinnedCommandId || pendingPulse.current !== pinnedCommandId) return
    pendingPulse.current = null
    setBurst(count => count + 1)
  }, [pinnedCommandId])
  useEffect(() => {
    /** Plays the ring's burst for a successful dry run. */
    const playBurst = () => setBurst(count => count + 1)
    /** Plays the burst for a drop, now if the ring already shows the command, or once it has remounted for it. */
    const playDropPulse = (commandId: CommandId) => {
      if (commandId === renderedPinId.current) playBurst()
      else pendingPulse.current = commandId
    }
    commandEmitter.on('pinnedGestureDryRun', playBurst)
    commandEmitter.on('commandPinnedByDrag', playDropPulse)
    return () => {
      commandEmitter.off('pinnedGestureDryRun', playBurst)
      commandEmitter.off('commandPinnedByDrag', playDropPulse)
    }
  }, [])
  // The ring lights up when a drag starts, brightens as the dragged command nears it, and grows when the command pops
  // in. It never dims: the resting ring is where the light starts from. The target follows the pointer on every move,
  // so it moves a motion value rather than rendering, and each change springs the ring toward it.
  const illumination = useMotionValue(0)
  commandDragStore.useEffect(
    useCallback(
      drag => {
        animate(
          illumination,
          drag
            ? drag.magnetized
              ? ILLUMINATION_MAGNETIZED
              : drag.source === 'pinned'
                ? ILLUMINATION_NEAR
                : ILLUMINATION_FAR + (ILLUMINATION_NEAR - ILLUMINATION_FAR) * drag.proximity
            : 0,
          { type: 'spring', stiffness: 170, damping: 26 },
        )
      },
      [illumination],
    ),
  )
  const dragScale = useSpring(1, { stiffness: 320, damping: 26 })
  // The grown ring also moves in from the corner, where it would otherwise run off the screen.
  const dragX = useSpring(0, { stiffness: 320, damping: 26 })
  const dragY = useSpring(0, { stiffness: 320, damping: 26 })
  useEffect(() => {
    dragScale.set(magnetized ? MAGNET_SCALE : dragSource ? DRAG_SCALE : 1)
    dragX.set(magnetized ? MAGNET_RING_SHIFT_X : dragSource ? DRAG_RING_SHIFT.x : 0)
    dragY.set(dragSource ? DRAG_RING_SHIFT.y : 0)
  }, [dragScale, dragSource, dragX, dragY, magnetized])
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
  const drag = useCommandDrag({
    commandId: pinnedCommandId ?? undefined,
    source: 'pinned',
    // Dragging the command out is not a hold, and takes the tooltip with it.
    onDragStart: useCallback(() => {
      hold.cancel()
      close()
    }, [close, hold]),
  })

  // A stored command may have been removed since the last app version. The empty ring still shows while a command is
  // dragged from the Command Universe, as the place to drop it.
  if (!command && dragSource !== 'universe') return null

  return (
    // The Mobile Command Universe closes on a press outside it. A press on the pinned command, which is layered above
    // it, is not outside it.
    <div data-above-dialog>
      {/* Rendered before the ring, which shares its layer while raised and must paint on top of it. */}
      {command && (
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
      )}
      {/* Fixed to the screen corner, so the ring stays put however the page scrolls, including over the footer at the end of the page. It sits on the pinnedCommand layer just above the NavBar, and rises above the tooltip's surface while that is visible. Position lives here; scale and lift stay on the button. */}
      <div
        ref={dockRef}
        // useCommandDrag measures the ring's center from the dock.
        data-pinned-command-dock
        className={cx(
          pinnedCommandDock,
          css({
            // Raised over Command Discovery, and over a drag's backdrop wherever the drag started.
            zIndex:
              isRaised || inCommandUniverse || inCommandDiscovery || dragSource
                ? 'pinnedCommandExpanded'
                : 'pinnedCommand',
          }),
        )}
      >
        <motion.button
          ref={ringRef}
          type='button'
          aria-label={command ? `Show gesture for ${command.label}` : 'Drop a command here to pin it'}
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
            if (!command) return
            hold.start()
            drag.onPointerDown(event)
          }}
          onPointerUp={hold.cancel}
          onPointerCancel={hold.cancel}
          // A drag out of the ring leaves it on purpose; useCommandDrag cancels the hold when the drag starts.
          onPointerLeave={() => {
            if (!commandDragStore.getState()) hold.cancel()
          }}
          // The hold is em's own; keep the platform's long-press menu out of it.
          onContextMenu={event => event.preventDefault()}
          onClick={event => {
            if (hold.consumeHold() || !command) return
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
          {/* The ring's growth when a command pops in, about its drawn center rather than its box's. An empty ring,
          shown only as the place to drop, fades in. */}
          <motion.div
            className={css({ transformOrigin: '36.42px 36.16px' })}
            style={{ scale: dragScale, x: dragX, y: dragY }}
            initial={{ opacity: command ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <PinnedCommandRing
              key={pinnedCommandId}
              // A command dropping in for the first time has no progress yet.
              progress={magnetCommand && magnetCommand.id !== pinnedCommandId ? 0 : progress}
              flourish={flourishes}
              burst={burst}
              activeOpacity={tooltipOpacity}
              illumination={illumination}
            >
              {ringCommand && (
                // Remounts when a dragged command pops in or out, so its arrival springs into the ring.
                <motion.div
                  key={`${ringCommand.id}-${!!magnetCommand}`}
                  className={css({ display: 'flex' })}
                  initial={magnetCommand ? { scale: 0.4, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: dragSource && !magnetCommand ? DRAG_ICON_OPACITY : 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                >
                  <PinnedCommandIcon command={ringCommand} repCount={magnetCommand ? 0 : newReps} />
                </motion.div>
              )}
            </PinnedCommandRing>
          </motion.div>
        </motion.button>
      </div>
    </div>
  )
}

export default PinnedCommand
