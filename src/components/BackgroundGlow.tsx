import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { BASE_FONT_SIZE } from '../constants'
import backgroundGlowStore from '../stores/backgroundGlowStore'

/** Distance (px, at the base font size) from the bottom edge of the nav bar to where the falloff becomes fully opaque, just above the breadcrumbs. Scales with font size, since the nav bar does. */
const FALLOFF_END_ABOVE_NAV = 34

/** Height (px) of the falloff's fade from transparent to opaque. */
const FALLOFF_HEIGHT = 63

const glowLayerStyles = css.raw({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'bottom center',
  backgroundRepeat: 'no-repeat',
})

/** A debug full-viewport background glow image rendered behind the thoughtspace. The image and opacity are selected from the picker in the Footer and persisted to local storage. */
const BackgroundGlow = () => {
  const { image, opacity } = backgroundGlowStore.useState()
  const showModal = useSelector(state => !!state.showModal)
  const fontSize = useSelector(state => state.fontSize)

  // Anchor the falloff to the nav bar rather than the viewport edge: the nav bar sits max(11px, safe area) above the bottom (see NavBar) and is scaled by font size, so a fixed offset leaves the fade too high on devices with a safe area inset or at small font sizes.
  const falloffEnd = `calc(100% - max(11px, env(safe-area-inset-bottom)) - ${(FALLOFF_END_ABOVE_NAV * fontSize) / BASE_FONT_SIZE}px)`
  const falloffMask = `linear-gradient(to bottom, transparent calc(${falloffEnd} - ${FALLOFF_HEIGHT}px), black ${falloffEnd})`

  return image ? (
    <>
      <div
        className={css(glowLayerStyles, {
          // A mirror image of the glow hanging below the viewport. When iOS rubber-bands past the end of the page, the visible area moves below the bottom of the layout viewport that fixed elements are anchored to, and without this the overscroll would uncover a stark band of page background beneath the glow. Mirroring makes the brightest edge of the glow continue across the seam, so the bounce just reveals more glow.
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
        style={{ backgroundImage: `url(/img/glow/${image})`, opacity }}
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
          })}
          // Panda cannot extract a runtime font size, so the mask stays inline.
          style={{ mask: falloffMask, WebkitMask: falloffMask }}
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
