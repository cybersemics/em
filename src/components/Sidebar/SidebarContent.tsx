import { motion } from 'framer-motion'
import { useState } from 'react'
import { css } from '../../../styled-system/css'
import { isAndroid } from '../../browser'
import Favorites from '../Favorites'
import RecentlyDeleted from '../RecentlyDeleted'
import RecentlyEdited from '../RecentlyEdited'
import { MEDIUM_DURATION, cssEaseOut } from './constants'
import { SidebarSectionId } from './sidebarSections'

/** Height (px) of the mask's fully-transparent band — the region hidden under the open dropdown. */
const DROPDOWN_MASK_BAND = 128

/** Height (px) of the mask's fade-to-black ramp. Doubles as the scroll-hint top fade. */
const SCROLL_HINT_FADE = 48

/** Extra carrier extent (px) beyond the scroll viewport — keeps every mask slide position covered. */
const MASK_OVERSIZE = DROPDOWN_MASK_BAND + SCROLL_HINT_FADE

/** Offsets that position the mask geometry relative to the scroll area's top edge. */
const DROPDOWN_MASK_OFFSET = -DROPDOWN_MASK_BAND
const SCROLL_HINT_MASK_OFFSET = -SCROLL_HINT_FADE

/**
 * The masked, scrollable content area below the header. Owns the sliding content mask: a
 * transparent band that hides the region under the open dropdown, plus a top-edge fade that
 * hints at scroll overflow once the list has been scrolled.
 *
 * The mask carrier is oversized and slides while the scroller counter-slides, so the gradient
 * moves without repainting or moving the content itself.
 */
const SidebarContent = ({
  sectionId,
  dropdownOpen,
  isSwiping,
}: {
  /** Active section; determines which content renders. */
  sectionId: SidebarSectionId
  /** Whether the section-picker dropdown is open. Dims and masks the list underneath. */
  dropdownOpen: boolean
  /** Disables Favorites drag-and-drop while a swipe-to-close gesture is in progress. */
  isSwiping: boolean
}) => {
  /** Whether the scrollable content area has been scrolled down.
   * Used to conditionally show a top fade-out mask for scroll overflow indication. */
  const [isScrolled, setIsScrolled] = useState(false)

  // Positions for the 128px dropdown band and 48px scroll fade:
  //   0     = band in place — the region under the open dropdown is hidden
  //   -128  = revealed, with the 48px scroll-hint fade at the top edge (list is scrolled)
  //   -176  = fully revealed (list at the top; no fade)
  const maskSlideY = dropdownOpen ? 0 : DROPDOWN_MASK_OFFSET + (isScrolled ? 0 : SCROLL_HINT_MASK_OFFSET)

  /** The content mask carried by the slider: a transparent band the height of the dropdown, then a
   * fade to fully visible over the scroll-hint ramp. */
  const maskGradient = `linear-gradient(to bottom, transparent 0, transparent ${DROPDOWN_MASK_BAND}px, black ${MASK_OVERSIZE}px)`

  return (
    <div
      className={css({
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      {/* The oversized mask carrier slides while the scroller counter-slides. */}
      <div
        style={{
          // Cover the viewport at every mask position.
          height: `calc(100% + ${MASK_OVERSIZE}px)`,
          transform: `translateY(${maskSlideY}px)`,
          transition: `transform ${MEDIUM_DURATION}s ${cssEaseOut}`,
          // Let taps pass through the carrier; the scroller opts back in.
          pointerEvents: 'none',
          // Android: promote before the mask transition to avoid a one-frame blank.
          willChange: isAndroid ? 'transform' : undefined,
          // Static mask: transparent for the band hidden under the open dropdown, then a
          // fade to fully visible. Inline rather than css() because Panda cannot extract a
          // template literal built from imported constants — it would silently drop the
          // mask. The -webkit- properties replace the prefixing Panda would have applied.
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskImage: maskGradient,
          WebkitMaskImage: maskGradient,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
        }}
        className={css({
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          display: 'flex',
          flexDirection: 'column',
        })}
      >
        <motion.div
          data-scroll-at-edge
          onScroll={e => setIsScrolled(e.currentTarget.scrollTop > 0)}
          style={{
            // Keep the list stationary as its mask carrier moves.
            height: `calc(100% - ${MASK_OVERSIZE}px)`,
            transform: `translateY(${-maskSlideY}px)`,
            // Dim the content while the dropdown is open.
            opacity: dropdownOpen ? 0.5 : 1,
            transition: `opacity ${MEDIUM_DURATION}s ${cssEaseOut}, transform ${MEDIUM_DURATION}s ${cssEaseOut}`,
            pointerEvents: 'auto',
            willChange: isAndroid ? 'opacity, transform' : undefined,
          }}
          className={css({
            flexShrink: 0,
            overflowY: 'scroll',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin',
            scrollbarColor: '{colors.fgOverlay30} transparent',
            '&::-webkit-scrollbar': {
              width: '0px',
              background: 'transparent',
              display: 'none',
            },
            position: 'relative',
            padding: '0 1em',
          })}
        >
          {/* Render the active section's content component */}
          {sectionId === 'favorites' ? (
            <Favorites disableDragAndDrop={isSwiping} />
          ) : sectionId === 'recentlyEdited' ? (
            <RecentlyEdited />
          ) : sectionId === 'recentlyDeleted' ? (
            <RecentlyDeleted />
          ) : (
            'Not yet implemented'
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default SidebarContent
