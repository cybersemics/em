import { useEffect, useId, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import CommandId from '../../@types/CommandId'
import { commandUniverseNavigateActionCreator as commandUniverseNavigate } from '../../actions/commandUniverseNavigate'
import { saveSelectionOffsetsActionCreator as saveSelectionOffsets } from '../../actions/saveSelectionOffsets'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../../actions/toggleMobileCommandUniverse'
import { commandById } from '../../commands'
import durations from '../../util/durations'
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
  const pinnedCommandId = useSelector(state => state.learning.pinnedCommandId)
  const progressRecord = useSelector(state => (pinnedCommandId ? state.learning.progress[pinnedCommandId] : undefined))
  const progress = progressRecord ? Math.min(1, progressRecord.reps / progressRecord.targetReps) : 0
  const complete = progress >= 1
  const previousCompletion = useRef({ pinnedCommandId, complete })
  const animateCompletion =
    previousCompletion.current.pinnedCommandId === pinnedCommandId && !previousCompletion.current.complete && complete

  useEffect(() => {
    previousCompletion.current = { pinnedCommandId, complete }
  }, [pinnedCommandId, complete])

  const isOpen = !!pinnedCommandId && openedCommandId === pinnedCommandId
  const isRingRaised = isOpen || keepRaisedDuringExit

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
      if (event.key === 'Escape') setOpenedCommandId(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!pinnedCommandId) return null

  const command = commandById(pinnedCommandId)
  const Icon = command.svg ?? SettingsIcon

  /** Open the registered Command Universe detail page for this command. */
  const revealCommand = () => {
    setOpenedCommandId(null)
    dispatch(toggleMobileCommandUniverse({ value: true, preserveSelectionOffsets: true }))
    dispatch(commandUniverseNavigate('detail', { command }))
  }

  return (
    <>
      <button
        type='button'
        aria-label={`Show gesture for ${command.label}`}
        aria-description={
          progressRecord
            ? `Practice progress: ${progressRecord.reps} of ${progressRecord.targetReps} repetitions`
            : 'Practice progress unavailable'
        }
        aria-expanded={isOpen}
        aria-controls={tooltipId}
        data-testid='pinned-command'
        onPointerDown={event => {
          // Record the editor selection before focusing an interactive control in the corner.
          dispatch(saveSelectionOffsets())
          event.preventDefault()
        }}
        onClick={event => {
          // Keyboard activation has no pointerdown; clear any stale snapshot before opening.
          if (event.detail === 0) dispatch(saveSelectionOffsets())
          setOpenedCommandId(pinnedCommandId)
        }}
        className={css({
          position: 'fixed',
          right: 0,
          // Align the ring's center with the home icon in the nav bar row. Measured in the browser, that center sits
          // max(11px, safe area) + 13.5px above the bottom edge, and the ring's center is 36.16px above the box bottom,
          // so the box bottom is offset - 22.5px. Written out literally because Panda only extracts static values; an
          // interpolated template literal is dropped, leaving the widget at its static position at the end of the page.
          bottom: 'calc(max(11px, token(spacing.safeAreaBottom)) - 22.5px)',
          zIndex: 'pinnedCommand',
          transformOrigin: 'right bottom',
          transition: 'transform {durations.medium} ease-out',
          padding: 0,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          pointerEvents: 'auto',
        })}
        style={{
          transform: isOpen ? 'scale(1.5)' : 'scale(1)',
          zIndex: isRingRaised ? token('zIndex.pinnedCommandExpanded') : undefined,
          // The enlarged ring overlaps Clear on desktop; let that control remain tappable.
          pointerEvents: isRingRaised ? 'none' : undefined,
        }}
      >
        <PinnedCommandRing progress={progress} complete={complete} animateCompletion={animateCompletion}>
          <Icon size={14} fill={token('colors.gray50')} cssRaw={css.raw({ flex: 'none' })} />
        </PinnedCommandRing>
      </button>
      <PinnedCommandTooltip
        id={tooltipId}
        command={command}
        isOpen={isOpen}
        onClose={() => setOpenedCommandId(null)}
        onReveal={revealCommand}
      />
    </>
  )
}

export default PinnedCommand
