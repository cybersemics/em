import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { MotionValue, Transition, motion } from 'framer-motion'
import { MouseEvent, ReactNode, RefObject, TouchEvent } from 'react'
import { css } from '../../../styled-system/css'

/**
 * The sidebar's sliding drawer panel: the Radix `Dialog.Content` plus the `motion.div` that
 * animates it open and closed. Owns how the panel renders and which gestures can close it;
 * `Sidebar` owns why (open state, and the swipe/tap decisions passed in as callbacks).
 */
const SidebarDrawer = ({
  drawerRef,
  x,
  width,
  widthAsCssString,
  contentOpacity,
  transition,
  showSidebar,
  isLargeDevice,
  title,
  onEdgeTap,
  onAnimationComplete,
  onTouchMove,
  onTouchEnd,
  children,
}: {
  /** Ref to the drawer element, shared with the document-level swipe handler so it can tell
   * backdrop-initiated touches from in-drawer ones. */
  drawerRef: RefObject<HTMLDivElement | null>
  /** The drawer's x-axis translation. 0 = fully open, -width = fully closed (off-screen). */
  x: MotionValue<number>
  /** Drawer width in px — used for the off-screen x position. */
  width: number
  /** CSS width of the drawer. */
  widthAsCssString: string
  /** Content opacity, shared with the glow overlays so they fade in sync with the drawer. */
  contentOpacity: MotionValue<number>
  /** The open/close animation's duration and easing. */
  transition: Transition
  /** Whether the sidebar is open. */
  showSidebar: boolean
  /** Whether the device is "large". The edge-tap-to-close zone only applies on small screens,
   * where the drawer is full-width and there's no backdrop sliver to tap instead. */
  isLargeDevice: boolean
  /** Accessible title announcing the active section, for screen readers. */
  title: string
  /** Fires when the user taps the right-edge close zone (small screens only). */
  onEdgeTap: () => void
  /** Fires when the open/close animation completes. */
  onAnimationComplete: () => void
  /** Detects a swipe starting inside the drawer, to disable Favorites drag-and-drop. */
  onTouchMove: (e: TouchEvent<HTMLDivElement>) => void
  onTouchEnd: () => void
  children: ReactNode
}) => {
  /** Tap-to-close zone on the right edge, for small screens where the drawer is full-width and
   * there's no backdrop sliver to tap. Checks the click position after the fact rather than a
   * dedicated overlay element, so scrolling inside the zone still works. Attached in the
   * capture phase — rather than the usual bubble phase — so it reliably sees the tap before any
   * nested descendant's own click handler (a Favorites row, a dropdown item) can act on it or
   * stop it from propagating; `stopPropagation` below then suppresses that descendant's own
   * reaction to the same tap. */
  const handleClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (isLargeDevice) return

    const { right, width: elementWidth } = e.currentTarget.getBoundingClientRect()
    if (e.clientX < right - elementWidth * 0.1) return

    e.preventDefault()
    e.stopPropagation()
    onEdgeTap()
  }

  return (
    /*
     * Dialog.Content is the actual sidebar drawer panel.
     * - asChild: renders as its child (motion.div) instead of adding an extra DOM node
     * - onOpenAutoFocus: prevented to stop focus from jumping into the sidebar on page load
     * - onInteractOutside: prevented to avoid double-toggle when tapping the hamburger icon
     *   (Sidebar's own backdrop click handler manages closing)
     * - onEscapeKeyDown: prevented because Sidebar handles Escape itself in a useEffect
     *   (Radix's built-in handler would close the dialog before that handler runs)
     */
    <Dialog.Content
      asChild
      onOpenAutoFocus={e => e.preventDefault()}
      onInteractOutside={e => e.preventDefault()}
      onEscapeKeyDown={e => e.preventDefault()}
      aria-describedby={undefined} // Suppress Radix console warning – not applicable here
    >
      {/* Unmount the drawer after its close animation. */}
      <motion.div
        ref={drawerRef}
        // width is inline because Panda cannot statically extract SIDEBAR_WIDTH_PX across
        // modules; in css() it emits no rule and the drawer collapses to its content width.
        style={{ x, opacity: contentOpacity, width: widthAsCssString }}
        initial={{ x: -width }}
        animate={{ x: showSidebar ? 0 : -width }}
        transition={transition}
        onAnimationComplete={onAnimationComplete}
        onClickCapture={handleClickCapture}
        className={css({
          position: 'fixed',
          top: 'safeAreaTop',
          left: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          zIndex: 'sidebar',
          userSelect: 'none',
          outline: 'none',
          pointerEvents: 'auto',
        })}
      >
        {/* Detects when the sidebar is mid-swipe-close and disables Favorites
            drag-and-drop so the two gestures don't fight. */}
        <div onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className={css({ height: '100%' })}>
          {/* Main sidebar content container – flex column layout */}
          <div
            aria-label='sidebar'
            className={css({
              background: 'transparent',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              color: 'fg',
              lineHeight: 1.8,
              userSelect: 'none',
              position: 'relative',
              overflow: 'hidden',
              isolation: 'isolate',
              paddingLeft: 'env(safe-area-inset-left)', // prevent notch from clipping content in landscape
            })}
          >
            {/* Visually hidden title for screen readers – announces the active section name */}
            <VisuallyHidden.Root>
              <Dialog.Title>{title}</Dialog.Title>
            </VisuallyHidden.Root>

            {children}
          </div>
        </div>
      </motion.div>
    </Dialog.Content>
  )
}

export default SidebarDrawer
