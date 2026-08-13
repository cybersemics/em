import { animate, useMotionValue } from 'motion/react'
import { FC, useEffect } from 'react'
import { css } from '../../../styled-system/css'
import { isAndroid } from '../../browser'
import gestureStore from '../../stores/gesture'
import durations from '../../util/durations'
import ProgressiveBlur from '../ProgressiveBlur'

/**
 * Renders a progressive blur over the app content while the gesture menu is open.
 *
 * Rendered by GestureMenu as a sibling of PopupBase, so at runtime it lands inside MultiGesture's
 * react-native-web <View> alongside the gesture trace. Per CSS painting order the blur
 * (position:fixed, z-index:gestureContentBlur) paints above the in-flow Content but below the
 * position:fixed; z-index:gestureTrace gesture trace — so the content behind the menu blurs while the
 * trace stays sharp. It is a sibling of PopupBase rather than a child so it is ordered in the shared
 * <View> stacking context instead of being trapped inside PopupBase's higher 'popup' stacking context.
 */
const GestureContentBlur: FC = () => {
  const animationState = gestureStore.useSelector(state => state.gestureMenuAnimationState)

  // A MotionValue drives the opacity of each backdrop-filter layer individually. Animating opacity on a
  // shared parent of backdrop-filter elements breaks the blur in WebKit, so ProgressiveBlur applies the
  // MotionValue per-layer rather than via a wrapping element.
  const blurOpacity = useMotionValue(0)
  useEffect(() => {
    // Match the menu content's FadeTransition type='fast' (durations.fast) so the blur and menu fade
    // in/out together. durations.get returns ms (0 in e2e tests); motion wants seconds.
    // On the way out the blur holds near full and clears late (easeInSlow, the easings.easeInSlow
    // token spelled as a literal since motion cannot read Panda tokens), so the content stays soft
    // behind the menu for the length of the fade instead of sharpening under it.
    const controls = animate(blurOpacity, animationState === 'visible' ? 1 : 0, {
      duration: durations.get('fast') / 1000,
      ease: animationState === 'exiting' ? [0.84, 0, 1, 1] : 'easeOut',
    })
    return controls.stop
  }, [animationState, blurOpacity])

  if (animationState === 'hidden') return null

  // Content (position:relative; zIndex:content) is positioned, so it paints in the positive-z-index
  // phase — above a z-index:auto overlay. The blur must therefore carry an explicit z-index that sits
  // above content but below the gesture trace (gestureTrace) for its backdrop-filter to soften the
  // content while leaving the trace sharp. All three share the gesture <View>'s stacking context.
  return (
    <div
      className={css({
        position: 'fixed',
        inset: 0,
        zIndex: 'gestureContentBlur',
        pointerEvents: 'none',
      })}
    >
      <ProgressiveBlur
        // Top-weighted falloff, but minBlur keeps every layer blurred so the effect reaches the
        // bottom of the viewport instead of hitting 0 partway down.
        direction='to bottom'
        maxBlur={8}
        minBlur={3}
        // Android/Chromium incurs a performance penalty from many concurrent backdrop-filter layers,
        // so cap it to a single layer there; iOS/WebKit tolerates more, giving a smoother falloff.
        layers={isAndroid ? 1 : 4}
        opacity={blurOpacity}
      />
    </div>
  )
}

export default GestureContentBlur
