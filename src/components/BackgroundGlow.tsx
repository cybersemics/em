import { Capacitor } from '@capacitor/core'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import backgroundGlowStore from '../stores/backgroundGlowStore'
import viewportStore from '../stores/viewportStore'

/** True in the Android app, where opening the virtual keyboard shrinks the WebView, and with it the layout viewport that fixed elements fill, to the space above the keyboard. Capacitor's SystemBars plugin pads the window by the keyboard height. On iOS (Keyboard resize: 'none') and mobile web (interactive-widget=overlays-content), the keyboard covers the page instead. */
const isAndroidApp = Capacitor.getPlatform() === 'android'

const glowLayerStyles = css.raw({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'bottom center',
  backgroundRepeat: 'no-repeat',
})

/** In the Android app, returns the tallest viewport height seen at the current width, so that when the keyboard opens and the WebView shrinks, the glow stays put and the keyboard covers its bottom, as on the other platforms, instead of shrinking and sliding up above the keyboard. Heights are kept per width so that a rotation starts over in the new orientation and restores the old one's height on the way back. The viewport is only selected in the Android app, so that the viewport updates iOS fires while scrolling with the keyboard up do not re-render the glow. Returns undefined on other platforms. An explicit height overrides the bottom of inset: 0, so the layers hang below the shrunken viewport. */
const useTallestViewportHeight = (): number | undefined => {
  const innerWidth = viewportStore.useSelector(state => (isAndroidApp ? state.innerWidth : 0))
  const innerHeight = viewportStore.useSelector(state => (isAndroidApp ? state.innerHeight : 0))
  const [tallestHeights, setTallestHeights] = useState<Record<number, number>>({})
  const tallestHeight = Math.max(innerHeight, tallestHeights[innerWidth] ?? 0)
  if (isAndroidApp && tallestHeight !== tallestHeights[innerWidth]) {
    setTallestHeights({ ...tallestHeights, [innerWidth]: tallestHeight })
  }
  return isAndroidApp ? tallestHeight : undefined
}

/** A debug full-viewport background glow image rendered behind the thoughtspace. The image and opacity are selected from the picker in the Footer and persisted to local storage. */
const BackgroundGlow = () => {
  const { image, opacity } = backgroundGlowStore.useState()
  const showModal = useSelector(state => !!state.showModal)

  const height = useTallestViewportHeight()

  return image ? (
    <>
      <div
        className={css(glowLayerStyles, {
          // A mirror image of the glow hanging below the viewport. When iOS rubber-bands past the end of the page, the visible area moves below the bottom of the layout viewport that fixed elements are anchored to, and without this the overscroll would uncover a stark band of page background beneath the glow. Mirroring makes the brightest edge of the glow continue across the seam, so the bounce just reveals more glow. See docs/ios-safari-viewport.md.
          _after: {
            content: '""',
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            height: '100%',
            backgroundImage: 'inherit',
            backgroundSize: 'inherit',
            backgroundPosition: 'inherit',
            backgroundRepeat: 'inherit',
            transform: 'scaleY(-1)',
          },
        })}
        data-testid='background-glow-layer'
        style={{ backgroundImage: `url(/img/glow/${image})`, opacity, height }}
      />
      {/* Falloff that fades the content out into the glow above the nav bar. Repaints the page background (bg + the glow at the same opacity, pixel-aligned with the layer above since both are fixed and anchored to the full viewport) masked in by a vertical gradient, so the content appears to dissolve into the glow rather than being blacked out. Rendered above the content but below the nav bar and footer. */}
      {!showModal && (
        <div
          className={css({
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 'backgroundGlowFalloff',
            backgroundColor: 'bg',
            mask: 'linear-gradient(to bottom, transparent calc(100% - 108px - token(spacing.safeAreaBottom)), black calc(100% - 45px - token(spacing.safeAreaBottom)))',
          })}
          style={{ height }}
        >
          <div
            className={css(glowLayerStyles, { position: 'absolute' })}
            style={{ backgroundImage: `url(/img/glow/${image})`, opacity }}
          />
        </div>
      )}
    </>
  ) : null
}

export default BackgroundGlow
