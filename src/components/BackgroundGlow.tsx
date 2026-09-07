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
      <div className={css(glowLayerStyles)} style={{ backgroundImage: `url(/img/glow/${image})`, opacity }} />
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
            style={{ backgroundImage: `url(/img/glow/${image})`, opacity }}
          />
        </div>
      )}
    </>
  ) : null
}

export default BackgroundGlow
