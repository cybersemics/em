import { animate, useMotionValue } from 'motion/react'
import { FC, useEffect } from 'react'
import { css } from '../../../styled-system/css'
import useFilteredCommands from '../../hooks/useFilteredCommands'
import gestureStore from '../../stores/gesture'
import ProgressiveBlur from '../ProgressiveBlur'
import {
  GESTURE_MENU_BOTTOM_TAIL_REM,
  GESTURE_MENU_HEADER_REM,
  GESTURE_MENU_PADDING_REM,
  GESTURE_MENU_ROW_GAP_REM,
  GESTURE_MENU_ROW_LABEL_REM,
} from './constants'

/**
 * Renders a progressive blur over the app content while the gesture menu is open.
 *
 * Rendered by GestureMenu as a sibling of PopupBase, so at runtime it lands inside MultiGesture's
 * react-native-web <View> alongside the gesture trace. Per CSS painting order the blur
 * (position:absolute, z-index:gestureContentBlur) paints above the in-flow Content but below the
 * position:fixed; z-index:gestureTrace gesture trace — so the content behind the menu blurs while the
 * trace stays sharp. It is a sibling of PopupBase rather than a child so it is ordered in the shared
 * <View> stacking context instead of being trapped inside PopupBase's higher 'popup' stacking context.
 */
const GestureContentBlur: FC = () => {
  const animationState = gestureStore.useSelector(state => state.gestureMenuAnimationState)
  const commands = useFilteredCommands('', { sortActiveCommandsFirst: true })

  const blurHeight =
    animationState === 'hidden'
      ? '0rem'
      : `${
          2 * GESTURE_MENU_PADDING_REM +
          GESTURE_MENU_HEADER_REM +
          commands.length * (GESTURE_MENU_ROW_LABEL_REM + GESTURE_MENU_ROW_GAP_REM) +
          GESTURE_MENU_BOTTOM_TAIL_REM
        }rem`

  // A MotionValue drives the opacity of each backdrop-filter layer individually. Animating opacity on a
  // shared parent of backdrop-filter elements breaks the blur in WebKit, so ProgressiveBlur applies the
  // MotionValue per-layer rather than via a wrapping element.
  const blurOpacity = useMotionValue(0)
  useEffect(() => {
    const controls = animate(blurOpacity, animationState === 'visible' ? 1 : 0, { duration: 0.15, ease: 'easeOut' })
    return controls.stop
  }, [animationState, blurOpacity])

  // Content (position:relative; zIndex:content) is positioned, so it paints in the positive-z-index
  // phase — above a z-index:auto overlay. The blur must therefore carry an explicit z-index that sits
  // above content but below the gesture trace (gestureTrace) for its backdrop-filter to soften the
  // content while leaving the trace sharp. All three share the gesture <View>'s stacking context.
  return (
    <div
      className={css({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 'gestureContentBlur',
        pointerEvents: 'none',
      })}
      // Cap the wrapper to the menu footprint; since ProgressiveBlur is position:absolute; inset:0
      // it fills the wrapper, so this caps the blur + feather to the menu height.
      style={{ height: blurHeight }}
    >
      <ProgressiveBlur
        // Max blur at the top, fading to 0 downward — matches the menu's top-weighted falloff.
        direction='to bottom'
        maxBlur={8}
        opacity={blurOpacity}
        // Feather the bottom edge so the blur fades out instead of cutting off.
        mask='linear-gradient(180deg, black 0%, black 80%, transparent 100%)'
      />
    </div>
  )
}

export default GestureContentBlur
