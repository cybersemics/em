import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import backgroundGlowStore from '../stores/backgroundGlowStore'

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
        // eslint-disable-next-line no-restricted-syntax -- The debug glows are about 5 MB, so they are not preloaded for every user.
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
            mask: 'linear-gradient(to bottom, transparent calc(100% - 108px - token(spacing.safeAreaBottom)), black calc(100% - 45px - token(spacing.safeAreaBottom)))',
          })}
        >
          <div
            className={css(glowLayerStyles, { position: 'absolute' })}
            // eslint-disable-next-line no-restricted-syntax -- The debug glows are about 5 MB, so they are not preloaded for every user.
            style={{ backgroundImage: `url(/img/glow/${image})`, opacity }}
          />
        </div>
      )}
    </>
  ) : null
}

export default BackgroundGlow
