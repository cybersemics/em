import { FC } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import State from '../../@types/State'
import { gestureString } from '../../commands'
import useGestureHighlight from '../../hooks/useGestureHighlight'
import {
  GESTURE_MENU_ITEM_DESCRIPTION_LINE_HEIGHT_REM,
  GESTURE_MENU_ITEM_LABEL_DESCRIPTION_GAP_REM,
  GESTURE_MENU_ITEM_SELECTED_PADDING_BOTTOM_REM,
  GESTURE_MENU_ITEM_SELECTED_PADDING_TOP_REM,
} from '../../hooks/useGestureMenuLayout'
import store from '../../stores/app'
import GestureDiagram from '../GestureDiagram'

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

/**
 * Per-row "descend into the fog" transforms for the last visible single-column rows (issue #3801 §4).
 * Index 0 = no fog; 1–4 fade progressively so hidden commands feel like they're emerging from fog.
 */
const FOG_STYLES: Record<number, { transform: string; opacity: number; filter: string }> = {
  1: { transform: 'translateX(0.65rem) scale(0.875)', opacity: 0.875, filter: 'blur(1.5px)' },
  2: { transform: 'translateX(0.95rem) scale(0.85)', opacity: 0.8, filter: 'blur(2px)' },
  3: { transform: 'translateX(2.1rem) scale(0.825)', opacity: 0.7, filter: 'blur(2.5px)' },
  4: { transform: 'translateX(2.8rem) scale(0.75)', opacity: 0.45, filter: 'blur(3px)' },
}

/** Renders a single command row inside the Gesture Menu. */
const GestureMenuItem: FC<{
  command: Command
  selected: boolean
  gestureInProgress: string
  isFirstCommand?: boolean
  /** Fog depth (0–4) applied to trailing single-column rows when the list overflows. 0/undefined = no fog. */
  fogDepth?: number
}> = ({ command, selected, gestureInProgress, isFirstCommand, fogDepth = 0 }) => {
  const disabled = useSelector((state: State) => !isExecutable(state, command))
  const isActive = command.isActive?.(store.getState())
  const description = useSelector((state: State) => {
    const descFn = (isActive && command.descriptionInverse) || command.description
    return typeof descFn === 'function' ? descFn(state) : descFn
  })

  const gestureHighlight = useGestureHighlight({ command, gestureInProgress, selected, disabled })

  const fog = FOG_STYLES[fogDepth]

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: selected ? 'stretch' : 'center',
        gap: '0.89rem',
        // Allow the row to shrink within a grid cell so the label's nowrap text does not overflow the column.
        minWidth: 0,
      })}
      // paddingTop/paddingBottom are computed from GESTURE_MENU_ITEM_SELECTED_PADDING_*_REM (shared
      // with useGestureMenuLayout's reserve calc), so they're plain inline styles — panda's css()
      // only extracts statically analyzable literals, not values from an imported constant.
      style={{
        // Always reserve the top padding on a column's first row so selecting it doesn't shift the
        // column down and misalign its top from sibling columns.
        paddingTop: selected || isFirstCommand ? `${GESTURE_MENU_ITEM_SELECTED_PADDING_TOP_REM}rem` : 0,
        paddingBottom: selected ? `${GESTURE_MENU_ITEM_SELECTED_PADDING_BOTTOM_REM}rem` : 0,
        // Fog transforms scale from the left edge so the translateX offset alone controls how far each
        // row has drifted right as it descends into the fog.
        ...(fog ? { ...fog, transformOrigin: 'left center' } : null),
      }}
    >
      <div
        className={css({
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: selected ? 'flex-start' : 'center',
          flexShrink: 0,
          width: '1rem',
          height: '1rem',
        })}
      >
        <GestureDiagram
          path={command.id === 'cancel' ? null : gestureString(command)}
          highlight={gestureHighlight}
          arrowhead='none'
          glow={false}
          useGradient={false}
          color={token('colors.dim')}
          highlightColor={token('colors.fg')}
          strokeWidth={3}
          maxHeight={18}
          maxWidth={18}
        />
      </div>

      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
        })}
        style={{ gap: `${GESTURE_MENU_ITEM_LABEL_DESCRIPTION_GAP_REM}rem` }}
      >
        <div
          className={css({
            lineHeight: '1em',
            fontSize: '0.95rem',
            whiteSpace: 'nowrap',
            color: disabled ? 'gray45' : selected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            fontWeight: selected ? 600 : 400,
            textShadow:
              selected && !disabled
                ? '0px 0px 24px rgba(255, 255, 255, 0.8), 0px 0px 12px rgba(255, 255, 255, 0.6)'
                : undefined,
          })}
        >
          {(isActive && command.labelInverse) || command.label}
        </div>

        {selected && (
          <p
            className={css({
              fontSize: '0.78rem',
              fontWeight: 400,
              color: 'fgOverlay75',
              marginBlock: 0,
            })}
            style={{ lineHeight: `${GESTURE_MENU_ITEM_DESCRIPTION_LINE_HEIGHT_REM}rem` }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export default GestureMenuItem
