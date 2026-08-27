import { startCase } from 'lodash'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import { FC, cloneElement, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { alertActionCreator as alert } from '../actions/alert'
import { redoActionCreator as redo } from '../actions/redo'
import { undoActionCreator as undo } from '../actions/undo'
import { commandEmitter } from '../commands'
import copy from '../device/copy'
import stepsToReproduce from '../selectors/stepsToReproduce'
import undoSteps, { UndoStep } from '../selectors/undoSteps'
import { isNavigation } from '../util/actionMetadata.registry'
import FadeTransition from './FadeTransition'
import CopyClipboard from './icons/CopyClipboard'

/** The maximum number of steps the slider spans. */
const MAX_STEPS = 10

/** The positions of the end and start handles, counted in steps back from the present (0), and the length of the history they were set against. */
interface Handles {
  end: number
  historyLength: number
  start: number
}

/** The name of the action that a step applied, as it appears in the undo alert, e.g. "New Thought". A navigation action is skipped in favor of the change it accompanies. */
const stepLabel = (step: UndoStep): string => {
  const actions = step.patches.flatMap(patch => patch[0].actions)
  return startCase(actions.find(action => !isNavigation(action)) ?? actions[0])
}

/** A slider with a start handle and an end handle over the undo history, plus a button that copies the steps to reproduce the actions between them. Dragging or tapping a handle moves the thoughtspace to the point in time under it. Both handles begin at the present with the start handle on top; dragging the start handle back reveals the end handle, which always stays at least one step after the start. */
const UndoRange: FC<{ handles: Handles | null; setHandles: (handles: { end: number; start: number }) => void }> = ({
  handles,
  setHandles,
}) => {
  const dispatch = useDispatch()
  const { steps, position } = useSelector(undoSteps)
  const max = Math.min(MAX_STEPS, steps.length)
  // Both handles are at the current state until the user moves one. They are clamped to the history, which can be regrouped
  // into fewer steps while they are set.
  const end = Math.min(handles?.end ?? position, max)
  const start = Math.min(handles?.start ?? position, max)

  /** Moves the thoughtspace to the point in time at the given position by undoing or redoing the exact patches of the steps in between. */
  const moveTo = (target: number) => {
    // Flush an edit typed since the slider was opened. It would otherwise be committed after the thoughtspace has already
    // moved, i.e. against a different state than it was typed into. See the flush when the slider opens.
    commandEmitter.trigger('command')
    dispatch((dispatch, getState) => {
      const { steps, position } = undoSteps(getState())
      const count = steps
        .slice(Math.min(target, position), Math.max(target, position))
        .reduce((sum, step) => sum + step.patches.length, 0)
      if (count > 0) {
        dispatch(target > position ? undo({ count }) : redo({ count }))
      }
    })
  }

  return (
    <>
      <Slider
        range
        allowCross={false}
        value={[end, start]}
        min={0}
        max={max}
        step={1}
        reverse
        ariaLabelForHandle={['undo slider end', 'undo slider start']}
        style={{ width: `${(max / MAX_STEPS) * 100}%` }}
        // rc-slider defaults the handle to `touch-action: pan-x`. When the handle lands in the scroll zone (where the app
        // intentionally does not preventDefault touchmove), the browser intermittently claims the drag as a horizontal pan,
        // leaving the slider unresponsive until the touch is held long enough to disambiguate. Forcing `touch-action: none`
        // on the slider elements makes the browser deliver every touch move to rc-slider instead (#4329).
        //
        // The default handle is only 14px, so a touch that lands a few pixels off the dot starts on the bare page (which
        // has no `touch-action: none`); in the scroll zone the browser then claims that first move as a pan and the drag
        // fails until the touch is held long enough to disambiguate. This is worst when the dot sits on the scroll/trace
        // zone border. Enlarging the handle slightly grows the `touch-action: none` grab target, giving more tolerance so
        // the touch is reliably handed to rc-slider on the first attempt. marginTop keeps the dot centered on the rail
        // (default 14px handle uses marginTop -5px, i.e. center +2px; for height H, marginTop = 2 - H/2).
        styles={{
          handle: { touchAction: 'none', width: 16, height: 16, marginTop: -6 },
          rail: { touchAction: 'none' },
          track: { touchAction: 'none' },
        }}
        // Render the name of the action under each handle. Handle 1 is the start handle, since range values are ascending.
        handleRender={(node, { index }) => {
          const value = index === 1 ? start : end
          const step = steps[value]
          return cloneElement(
            node,
            {
              // Tapping a handle moves the thoughtspace to its point in time, e.g. back to the start after the end handle
              // was dragged. A drag has already done so through onChange, in which case this is a no-op.
              onMouseUp: () => moveTo(value),
              onTouchEnd: () => moveTo(value),
            },
            step ? (
              <span
                className={css({
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '0.25em',
                  whiteSpace: 'nowrap',
                  fontSize: '0.7em',
                  color: 'fg',
                  pointerEvents: 'none',
                  userSelect: 'none',
                })}
              >
                {stepLabel(step)}
              </span>
            ) : null,
          )
        }}
        onChange={value => {
          if (!Array.isArray(value)) return
          const [endNext, startNext] = value
          // rc-slider moves one handle at a time and, with allowCross disabled, stops it where it touches the other. Keep
          // the end at least one step after the start so that the range always spans a step, except at the present where
          // the two coincide. A handle that would cross this boundary stays put.
          const startClamped = startNext === start ? start : Math.max(startNext, end === 0 ? 0 : end + 1)
          const endClamped = startNext === start ? Math.min(endNext, Math.max(0, start - 1)) : end
          if (startClamped === start && endClamped === end) return
          setHandles({ end: endClamped, start: startClamped })
          // show the point in time under the handle that moved
          moveTo(startNext === start ? endClamped : startClamped)
        }}
      />
      <a
        aria-label='copy steps to reproduce'
        className={css({ cursor: 'pointer', lineHeight: 0, flexShrink: 0 })}
        onClick={() =>
          dispatch((dispatch, getState) => {
            copy(stepsToReproduce(getState(), { start, end }))
            dispatch(alert('Copied steps to reproduce to the clipboard'))
          })
        }
      >
        <CopyClipboard size={18} />
      </a>
    </>
  )
}

/** Undo slider that can rewind edits and copy the steps to reproduce them. */
const UndoSlider: FC = () => {
  const showUndoSlider = useSelector(state => !!state.showUndoSlider)
  const historyLength = useSelector(state => state.undoPatches.length + state.redoPatches.length)
  // The handles are held here rather than in UndoRange, which is unmounted while the slider is closed, so that closing and
  // reopening the slider leaves them where the user put them. They are discarded when a new action discards the history ahead
  // of the current state, since they no longer refer to the same steps; undo and redo only move a patch between the two
  // stacks, leaving the total unchanged.
  const [handles, setHandles] = useState<Handles | null>(null)

  // Flush any pending throttled edit when the slider opens, so that the last edit is part of the history the slider moves
  // through. Editing dispatches editThought on a throttle, and the toolbar does not flush it the way the keyboard and gesture
  // paths do, so an edit typed just before opening the slider is not recorded yet: it would be missing from the steps and lost
  // as soon as the slider moved the thoughtspace. A toolbar picker has the same hazard, and formatSelectionColor flushes for
  // the same reason (#4657).
  useEffect(() => {
    if (showUndoSlider) commandEmitter.trigger('command')
  }, [showUndoSlider])

  return (
    <FadeTransition in={showUndoSlider} type='medium' unmountOnExit>
      <div
        className={css({
          position: 'fixed',
          width: `calc(100% - 6em)`,
          zIndex: 'toolbarContainer',
          margin: '3.5em 3em 0',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5em',
        })}
      >
        <UndoRange
          handles={handles?.historyLength === historyLength ? handles : null}
          setHandles={({ end, start }) => setHandles({ end, historyLength, start })}
        />
      </div>
    </FadeTransition>
  )
}

export default UndoSlider
