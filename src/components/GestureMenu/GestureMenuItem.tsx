import { useTransform } from 'motion/react'
import { FC, Ref, useEffect, useLayoutEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import State from '../../@types/State'
import { discoverFromGestureMenu, gestureString } from '../../commands'
import useGestureHighlight from '../../hooks/useGestureHighlight'
import {
  SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM,
  SELECTED_ITEM_GAP_REM,
  SELECTED_ITEM_PADDING_BOTTOM_REM,
  SELECTED_ITEM_PADDING_TOP_REM,
} from '../../hooks/useGestureMenuLayout'
import store from '../../stores/app'
import commandDiscoveryStore from '../../stores/commandDiscoveryStore'
import GestureDiagram from '../GestureDiagram'
import useGenieWarmup from '../HelpGenie/useGenieWarmup'
import GhostFog from './GhostFog'
import useGhostCharge from './useGhostCharge'

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

/** Half the width of the charged fog's soft leading edge, as a percentage of the name's width. */
const CHARGE_EDGE = 18

/**
 * The undiscovered command's title: a fog the width of its name rather than the name itself, drawn by blurring the
 * name until it cannot be read. While the gesture matches it, holding still charges it (useGhostCharge): a denser,
 * brighter fog spreads across it from the left, with a soft leading edge, and thickens as it goes. Moving the finger
 * drains it back. When it is full the command is discovered.
 */
const GhostTitle = ({ command, selected, ref }: { command: Command; selected: boolean; ref?: Ref<HTMLDivElement> }) => {
  const charge = useGhostCharge({ active: selected, onCharged: () => discoverFromGestureMenu(command) })
  // The genie performs the discovery the hold may lead to, so it starts while the user holds rather than in the middle
  // of the discovery.
  useGenieWarmup(selected)
  // The charged fog's reveal: opaque up to the leading edge and clear beyond it. The edge starts fully off the left at
  // no charge and ends fully past the right at full charge.
  const maskImage = useTransform(charge, c => {
    const edge = c * (100 + 2 * CHARGE_EDGE) - CHARGE_EDGE
    return `linear-gradient(90deg, black ${edge - CHARGE_EDGE}%, transparent ${edge + CHARGE_EDGE}%)`
  })
  // The charged fog thickens as it spreads, so the fill reads as fog gathering rather than a bar lighting up.
  const chargedOpacity = useTransform(charge, [0, 1], [0.55, 1])

  return (
    <div
      ref={ref}
      aria-label='Undiscovered command'
      className={css({ position: 'relative', lineHeight: '1em', fontSize: '0.95rem', whiteSpace: 'nowrap' })}
    >
      <GhostFog label={command.label} chargedOpacity={chargedOpacity} chargedMask={maskImage} />
    </div>
  )
}

/** Renders a single command row inside the Gesture Menu. */
const GestureMenuItem: FC<{
  command: Command
  selected: boolean
  gestureInProgress: string
  isFirstCommand?: boolean
  isLastCommand?: boolean
  /** Whether to scroll the selected row into view. Disabled in the non-scrolling multi-column grid. Defaults to true. */
  autoScroll?: boolean
  /**
   * The row is the menu's one undiscovered command: its title is a fog rather than a name, and once the gesture
   * matches it, it invites the user to hold still on it to discover it instead of describing itself. See
   * docs/learning.md.
   */
  ghost?: boolean
}> = ({ command, selected, gestureInProgress, isFirstCommand, isLastCommand, autoScroll = true, ghost = false }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  // The gesture's box, whose drawing Command Discovery carries down with the title.
  const gestureRef = useRef<HTMLDivElement | null>(null)
  const disabled = useSelector((state: State) => !isExecutable(state, command))
  const isActive = command.isActive?.(store.getState())
  const description = useSelector((state: State) => {
    const descFn = (isActive && command.descriptionInverse) || command.description
    return typeof descFn === 'function' ? descFn(state) : descFn
  })

  const gestureHighlight = useGestureHighlight({ command, gestureInProgress, selected, disabled })

  // Command Discovery starts the command's fog where the ghost's title is, so the ghost reports where that is.
  useLayoutEffect(() => {
    if (!ghost || !titleRef.current) return
    const rect = titleRef.current.getBoundingClientRect()
    const gesture = gestureRef.current?.querySelector('svg')?.getBoundingClientRect()
    commandDiscoveryStore.update({
      origin: {
        x: rect.left,
        y: rect.top + rect.height / 2,
        width: rect.width,
        gesture: gesture ? { x: gesture.left + gesture.width / 2, y: gesture.top + gesture.height / 2 } : null,
      },
    })
  })

  useEffect(() => {
    if (!autoScroll || !selected) return
    if (!isFirstCommand && !isLastCommand) {
      ref.current?.scrollIntoView({ block: 'nearest' })
      return
    }
    const scrollContainer = ref.current?.parentElement
    if (scrollContainer) {
      scrollContainer.scrollTop = isFirstCommand ? 0 : scrollContainer.scrollHeight
    }
  })

  return (
    <div
      ref={ref}
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
        paddingTop: selected || isFirstCommand ? `${SELECTED_ITEM_PADDING_TOP_REM}rem` : 0,
        paddingBottom: selected ? `${SELECTED_ITEM_PADDING_BOTTOM_REM}rem` : 0,
      }}
    >
      <div
        ref={gestureRef}
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
        style={{ gap: `${SELECTED_ITEM_GAP_REM}rem` }}
      >
        {ghost ? (
          <GhostTitle ref={titleRef} command={command} selected={selected} />
        ) : (
          <div
            className={css({
              lineHeight: '1em',
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',

              color: disabled ? 'gray45' : selected ? 'white' : 'white/60',
              fontWeight: selected ? 600 : 400,
              textShadow:
                selected && !disabled
                  ? '0px 0px 24px rgba(255, 255, 255, 0.8), 0px 0px 12px rgba(255, 255, 255, 0.6)'
                  : undefined,
            })}
          >
            {(isActive && command.labelInverse) || command.label}
          </div>
        )}

        {selected && ghost && (
          <p
            className={css({
              fontFamily: 'radioCanada',
              fontStyle: 'italic',
              fontSize: '0.83rem',
              fontWeight: 400,
              marginBlock: 0,
              opacity: 0.83,

              backgroundImage: 'linear-gradient(90deg, {colors.ghostHintStart}, {colors.ghostHintEnd})',
              backgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 1px 7px {colors.ghostHintGlow})',
              animation: 'ghostHintIn 0.5s ease-out both',
            })}
            style={{ lineHeight: `${SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM}rem` }}
          >
            hold to discover
          </p>
        )}

        {selected && !ghost && (
          <p
            className={css({
              fontSize: '0.78rem',
              fontWeight: 400,
              color: 'fgOverlay75',
              marginBlock: 0,
            })}
            style={{ lineHeight: `${SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM}rem` }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export default GestureMenuItem
