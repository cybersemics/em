import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import getSafeAreaBottom from '../device/virtual-keyboard/getSafeAreaBottom'
import backgroundGlowStore from '../stores/backgroundGlowStore'
import debugLog from '../util/debugLog'

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
  const falloffRef = useRef<HTMLDivElement>(null)

  // Temporary diagnostic for the falloff rendering too high in the iOS PWA: logs where the falloff and the nav bar actually sit when the glow is selected and after each scroll settles, so their geometry can be compared on the device.
  useEffect(() => {
    if (!image || !debugLog.isEnabled()) return

    /** Logs the falloff and nav bar geometry. */
    const logGeometry = () => {
      const falloffRect = falloffRef.current?.getBoundingClientRect()
      const navRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
      debugLog.log('glowFalloff', {
        falloffTop: falloffRect?.top,
        falloffBottom: falloffRect?.bottom,
        navTop: navRect?.top,
        navBottom: navRect?.bottom,
        safeAreaBottom: getSafeAreaBottom(),
        innerHeight: window.innerHeight,
        clientHeight: document.documentElement.clientHeight,
        screenHeight: window.screen.height,
        visualViewportHeight: window.visualViewport?.height,
        visualViewportOffsetTop: window.visualViewport?.offsetTop,
        scrollY: window.scrollY,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
      })
    }

    // only reschedule a timer on scroll; the layout reads happen once the scroll has settled
    let timer: ReturnType<typeof setTimeout> | undefined
    /** Logs the geometry once scrolling has stopped for 500ms. */
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(logGeometry, 500)
    }

    const frame = requestAnimationFrame(logGeometry)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [image, showModal])

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
          ref={falloffRef}
          className={css({
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 'backgroundGlowFalloff',
            backgroundColor: 'bg',
            // Offset from the nav bar's bottom edge, which sits max(11px, safe area) above the viewport bottom (see NavBar), rather than adding the full safe area inset on top of 11px. Otherwise the fade sits too high on devices with a safe area inset.
            mask: 'linear-gradient(to bottom, transparent calc(100% - 97px - max(11px, token(spacing.safeAreaBottom))), black calc(100% - 34px - max(11px, token(spacing.safeAreaBottom))))',
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
