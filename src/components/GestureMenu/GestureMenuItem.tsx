import { FC, Ref, useEffect, useLayoutEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import State from '../../@types/State'
import { gestureString } from '../../commands'
import useGestureHighlight from '../../hooks/useGestureHighlight'
import {
  SELECTED_ITEM_DESCRIPTION_LINE_HEIGHT_REM,
  SELECTED_ITEM_GAP_REM,
  SELECTED_ITEM_PADDING_BOTTOM_REM,
  SELECTED_ITEM_PADDING_TOP_REM,
} from '../../hooks/useGestureMenuLayout'
import store from '../../stores/app'
import commandDiscoveryStore from '../../stores/commandDiscoveryStore'
import haptics from '../../util/haptics'
import GestureDiagram from '../GestureDiagram'

/** Returns true if the command can be executed in the current state. */
const isExecutable = (state: State, command: Command) =>
  (!command.canExecute || command.canExecute(state)) &&
  (command.allowExecuteFromModal || !state.showModal || !state.showMobileCommandUniverse)

/** How long the ghost takes to build up to full strength once the gesture matches it, in ms. */
const GHOST_EXCITE_MS = 900

/** The ghost's two fogs: at rest, a tinted display color running into the menu's dark; excited, lavender. */
const ghostFog = {
  resting: css({
    backgroundImage:
      'linear-gradient(90deg, {colors.ghostFogStart} 0%, {colors.ghostFogStart} 28%, {colors.ghostFogEnd} 88%, {colors.ghostFogEnd} 100%)',
  }),
  excited: css({
    backgroundImage:
      'linear-gradient(90deg, {colors.ghostExcitedStart} 0%, {colors.ghostExcitedEnd} 38%, {colors.ghostFogEnd} 62%, {colors.ghostExcitedStart} 100%)',
  }),
}

/**
 * The undiscovered command's title: a fog the width of its name rather than the name itself. The name is drawn in a
 * gradient that runs from a tinted display color into the menu's dark, then blurred until it cannot be read. Once the
 * gesture matches it, it excites: its color shifts toward lavender, it brightens, and its fog drifts.
 */
const GhostTitle = ({ label, excited, ref }: { label: string; excited: boolean; ref?: Ref<HTMLDivElement> }) => (
  <div
    ref={ref}
    aria-label='Undiscovered command'
    className={css({ position: 'relative', lineHeight: '1em', fontSize: '0.95rem', whiteSpace: 'nowrap' })}
  >
    {/* Two fogs, crossfaded, since a gradient's colors cannot be transitioned. */}
    {[false, true].map(isExcitedLayer => (
      <span
        key={String(isExcitedLayer)}
        aria-hidden
        className={cx(
          isExcitedLayer ? ghostFog.excited : ghostFog.resting,
          css({
            display: 'block',
            fontWeight: 400,
            backgroundClip: 'text',
            color: 'transparent',
            transitionProperty: 'opacity, filter',
            transitionTimingFunction: 'ease-in',
          }),
        )}
        style={{
          position: isExcitedLayer ? 'absolute' : 'relative',
          backgroundSize: isExcitedLayer ? '200% 100%' : '100% 100%',
          inset: isExcitedLayer ? 0 : undefined,
          filter: `blur(${isExcitedLayer ? (excited ? 4 : 6) : 5.5}px)`,
          opacity: isExcitedLayer ? (excited ? 1 : 0) : excited ? 0 : 0.9,
          transitionDuration: `${GHOST_EXCITE_MS}ms`,
          animation: isExcitedLayer && excited ? 'ghostFogDrift 2.6s linear infinite' : undefined,
        }}
      >
        {label}
      </span>
    ))}
  </div>
)

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
   * matches it, it invites a release to discover it instead of describing itself. See docs/learning.md.
   */
  ghost?: boolean
}> = ({ command, selected, gestureInProgress, isFirstCommand, isLastCommand, autoScroll = true, ghost = false }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  const disabled = useSelector((state: State) => !isExecutable(state, command))
  const isActive = command.isActive?.(store.getState())
  const description = useSelector((state: State) => {
    const descFn = (isActive && command.descriptionInverse) || command.description
    return typeof descFn === 'function' ? descFn(state) : descFn
  })

  const gestureHighlight = useGestureHighlight({ command, gestureInProgress, selected, disabled })

  // Command Discovery starts its light where the ghost's title is, so the ghost reports where that is.
  useLayoutEffect(() => {
    if (!ghost || !titleRef.current) return
    const rect = titleRef.current.getBoundingClientRect()
    commandDiscoveryStore.update({ origin: { x: rect.left, y: rect.top + rect.height / 2 } })
  })

  // Holding on the ghost builds up to the release: a haptic lands as its light reaches full strength.
  useEffect(() => {
    if (!ghost || !selected) return
    const timer = window.setTimeout(() => haptics.light(), GHOST_EXCITE_MS)
    return () => window.clearTimeout(timer)
  }, [ghost, selected])

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
          <GhostTitle ref={titleRef} label={command.label} excited={selected} />
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
            release your finger to discover
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
