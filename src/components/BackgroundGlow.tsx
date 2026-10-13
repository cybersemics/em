import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { isTouch } from '../browser'
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

/** The falloff that hides content scrolling under the nav bar, and the debug full-viewport background glow image rendered behind the thoughtspace. The glow image and opacity are selected from the picker in the Footer and persisted to local storage. */
const BackgroundGlow = () => {
  const { image, opacity } = backgroundGlowStore.useState()
  const showModal = useSelector(state => !!state.showModal)
  // On touch devices the nav bar drops out of position: sticky while the keyboard is open (see NavBar), so there is no nav bar at the bottom of the viewport to fade into.
  const navBarInFlow = useSelector(state => isTouch && state.isKeyboardOpen)
  // With no thought selected there are no breadcrumbs, so there is no nav bar for the content to fade into.
  const isCursor = useSelector(state => !!state.cursor)
  const falloffRef = useRef<HTMLDivElement>(null)

  // Temporary diagnostic: on the device the falloff hides content from higher than its gradient stops predict. Logs the geometry of the nav bar, the breadcrumbs and the falloff, the safe area inset as CSS resolves it, and the computed mask, with the glow on and off, once on toggle and after each scroll settles.
  useEffect(() => {
    if (!debugLog.isEnabled()) return

    /** Rounds a rect to its top and bottom edges. */
    const edges = (el: Element | null | undefined) => {
      const rect = el?.getBoundingClientRect()
      return rect ? [Math.round(rect.top * 10) / 10, Math.round(rect.bottom * 10) / 10] : null
    }

    /** Logs the falloff, nav bar and breadcrumbs geometry. */
    const logGeometry = () => {
      // measure env(safe-area-inset-bottom) as CSS resolves it, rather than the JS-side variable
      const probe = document.createElement('div')
      probe.style.cssText =
        'position:fixed;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom);pointer-events:none;visibility:hidden'
      document.body.appendChild(probe)
      const envSafeAreaBottom = probe.getBoundingClientRect().height
      probe.remove()
      const nav = document.querySelector('[aria-label="nav"]')
      const falloffStyle = falloffRef.current ? getComputedStyle(falloffRef.current) : null
      debugLog.log('glowFalloff', {
        glow: !!image,
        falloff: edges(falloffRef.current),
        nav: edges(nav),
        navChild: edges(nav?.firstElementChild),
        breadcrumbs: edges(document.querySelector('[aria-label="context-breadcrumbs"]')),
        envSafeAreaBottom,
        clientHeight: document.documentElement.clientHeight,
        innerHeight: window.innerHeight,
        scrollY: Math.round(window.scrollY),
        mask: falloffStyle ? falloffStyle.maskImage || falloffStyle.webkitMaskImage : null,
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
  }, [image, showModal, navBarInFlow, isCursor])

  return (
    <>
      {image && (
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
          style={{ backgroundImage: `url(/img/glow/${image})`, opacity }}
        />
      )}
      {/* The one mask that hides content scrolling under the nav bar, with or without a glow. Repaints the page background (bg, plus the glow at the same opacity when one is selected, pixel-aligned with the layer above since both are fixed and anchored to the full viewport) masked in by a vertical gradient, so the content fades into whatever the background is rather than into a band painted by the nav bar. Rendered above the content but below the nav bar and footer. */}
      {!showModal && !navBarInFlow && isCursor && (
        <div
          ref={falloffRef}
          className={css({
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 'navbarFalloff',
            backgroundColor: 'bg',
            // Fades in over the 20px above the nav bar's top edge and is opaque from that edge down. Offsets are from the nav bar's bottom edge, which sits max(11px, safe area) above the viewport bottom (see NavBar); its top edge is 25px above that with breadcrumbs showing.
            mask: 'linear-gradient(to bottom, rgb(0 0 0 / 0) calc(100% - 45px - max(11px, token(spacing.safeAreaBottom))), rgb(0 0 0 / 1) calc(100% - 25px - max(11px, token(spacing.safeAreaBottom))))',
          })}
        >
          {image && (
            <div
              className={css(glowLayerStyles, { position: 'absolute' })}
              style={{ backgroundImage: `url(/img/glow/${image})`, opacity }}
            />
          )}
        </div>
      )}
    </>
  )
}

export default BackgroundGlow
