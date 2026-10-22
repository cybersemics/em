// PROTOTYPE — visual experiment only, not for merge.
//
// Dropdown: the timeline and geometry shared by every layer of a popup-button menu. It owns
//   - the phase (closed → entering → open → closing → closed), including the one frame drawn in the
//     closed state so the layers have something to animate from;
//   - the timings (content and light durations, easing), so every layer moves on one clock;
//   - the geometry: the anchor's rect, the menu's rect, and where the selected row sits in the menu;
//   - dismissal: the tap catcher, and stopping presses from reaching click-outside handlers.
// Layers read all of this from context and only decide how they look at each phase:
// DropdownRows draws the menu, DropdownLight draws the glow, useSurfaceMask dims what's underneath.
import {
  CSSProperties,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { token } from '../../../styled-system/tokens'
import durations from '../../util/durations'
import useDialsVersion from './dials'

/** Above the dialog: the layers are later in <body>, so the same z-index paints over it. */
export const DROPDOWN_Z_INDEX = Number(token('zIndex.dialog'))

/** Default easing for every layer (matches the sidebar's EASE_OUT). */
const EASE = 'cubic-bezier(0.16, 0.6, 0.2, 1)'

/**
 * Where the menu sits relative to its anchor.
 * - 'around': the menu is positioned so the selected item lands on the anchor; the rest appear above and below.
 *   The selected row never moves; the menu does (and glides when a new item is picked).
 * - 'below': the menu hangs from the top of its container; the selected row slides up to the top when closing and
 *   back to its place when opening (the sidebar's section picker).
 * - 'down': the menu drops down from the anchor, so the first item lands on the anchor and every item opens in the
 *   same place whichever is selected. The selected row slides down to its place when opening and back up onto the
 *   anchor when closing.
 */
export type DropdownPlacement = 'around' | 'below' | 'down'

/** Which edge of the anchor the menu lines up with. 'end': right edges (icons on the right). */
export type DropdownAlign = 'end'

interface Timing {
  /** Rows, content mask: the sidebar's MEDIUM duration (s). */
  content: number
  /** Light: runs longer, starting at the same moment, like the sidebar's glow (s). */
  light: number
  ease: string
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface DropdownContextValue {
  /** Requested open (true the moment the user opens it, false the moment they close it). */
  open: boolean
  /** Open for styling purposes: requested open and past the first closed-state frame. */
  isOpen: boolean
  /** Mounted: from opening until the close animation has finished. */
  visible: boolean
  timing: Timing
  /** Builds a transition string on the shared clock. dur defaults to timing.content. */
  transition: (props: string[], opts?: { dur?: number; delay?: number }) => string
  anchorRect: DOMRect | null
  placement: DropdownPlacement
  /** Vertical centre of the selected item's anchor point, in viewport coordinates (px). */
  selectedY: number
  /** The menu's rect in viewport coordinates (zero-sized until measured). */
  menuRect: Rect
  selectedId: string
  /** Style for the menu column: position, the closing glide, pointer events. */
  menuStyle: CSSProperties
  /** Motion for a non-selected row (or heading/separator/action): wakes with the light, settles out of the selection. */
  rowMotion: (key: string) => CSSProperties
  /** For 'below' and 'down': motion for the selected row, which slides onto the trigger when closed and back when open. */
  selectedTravel: CSSProperties
  /** For 'below': how far the selected item's anchor point sits from the top of the menu (px). */
  selectedOffset: number
  /** Motion for a light layer: fades in and grows from scaleFrom, on the light's duration. */
  lightMotion: (scaleFrom?: number) => CSSProperties
  /** Ref for the menu column, so its size can be measured. */
  menuRef: (el: HTMLElement | null) => void
  /** Ref for a row, keyed, so its offset in the menu can be measured. */
  registerRow: (key: string) => (el: HTMLElement | null) => void
  /** Ref for an item's anchor point (its icon box): the element that lands on the anchor when the item is selected. */
  registerAnchorPoint: (id: string) => (el: HTMLElement | null) => void
  select: (id: string) => void
  close: () => void
  /** Spread onto anything interactive the dropdown renders outside the surface it belongs to. */
  stopPress: typeof stopPress
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

/** Reads the enclosing Dropdown's shared state. */
export const useDropdown = () => {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error('useDropdown must be used inside a <Dropdown>.')
  return ctx
}

/**
 * Stops a press from reaching document-level listeners. The dropdown's layers live in <body>,
 * outside the surface they belong to, so a dialog's click-outside handler (useOnClickOutside
 * listens for mousedown/touchstart on document) would otherwise treat every tap as a dismissal.
 */
const stopPress = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
}

interface DropdownProps<T extends string> {
  open: boolean
  /** The user dismissed the menu (tap outside, or an action). */
  onClose: () => void
  /** The close animation has finished; the anchor can draw its own glyph again. */
  onClosed?: () => void
  onSelect: (id: T) => void
  /** The element the menu opens from. */
  anchor: HTMLElement | null
  selectedId: T
  placement?: DropdownPlacement
  align?: DropdownAlign
  /**
   * Keep the children mounted while closed, with no entering frame. For menus whose selected row is
   * always on screen (the sidebar's header), rather than layers that appear only while open.
   */
  persistent?: boolean
  /** Render the full-screen tap catcher. Off for owners that provide their own dismissal area. */
  catcher?: boolean
  children: ReactNode
}

/** Shallow-compares two measurement maps, so re-measuring every render only re-renders on a real change. */
const sameRects = (a: Record<string, Rect>, b: Record<string, Rect>) => {
  const keys = Object.keys(a)
  return (
    keys.length === Object.keys(b).length &&
    keys.every(k => b[k] && a[k].top === b[k].top && a[k].height === b[k].height && a[k].width === b[k].width)
  )
}

const Dropdown = <T extends string>({
  open,
  onClose,
  onClosed,
  onSelect,
  anchor,
  selectedId,
  placement = 'around',
  persistent = false,
  catcher = true,
  children,
}: DropdownProps<T>) => {
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)
  const visible = persistent || mounted
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const menuEl = useRef<HTMLElement | null>(null)
  const rowEls = useRef<Record<string, HTMLElement | null>>({})
  const anchorPointEls = useRef<Record<string, HTMLElement | null>>({})
  const [rows, setRows] = useState<Record<string, Rect>>({})
  const [anchorPoints, setAnchorPoints] = useState<Record<string, Rect>>({})
  const [menuSize, setMenuSize] = useState({ width: 0, height: 0 })
  const closeTimer = useRef<number>(undefined)
  // Persistent menus are "visible" from the start; only report onClosed after an actual open.
  const wasOpen = useRef(false)
  if (open) wasOpen.current = true
  // Held in a ref so a new callback identity each render doesn't restart the close timer.
  const onClosedRef = useRef(onClosed)
  onClosedRef.current = onClosed

  // Dials can change the menu's size (row padding, font size); re-render so it is re-measured.
  useDialsVersion()

  const timing: Timing = { content: durations.get('medium') / 1000, light: durations.get('slow') / 1000, ease: EASE }
  const isOpen = persistent ? open : open && entered

  // Measure the anchor and mount the layers each time the menu opens, then wait two frames (one to paint the
  // closed state, one to start the transition from it) before switching to open.
  useLayoutEffect(() => {
    if (!open) return
    window.clearTimeout(closeTimer.current)
    if (anchor) setAnchorRect(anchor.getBoundingClientRect())
    if (persistent) return
    setMounted(true)
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [open, anchor, persistent])

  // Keep the layers mounted through the close animation (the light runs longest), then report back.
  useEffect(() => {
    if (open || !visible || (persistent && !wasOpen.current)) return
    closeTimer.current = window.setTimeout(() => {
      setMounted(false)
      setEntered(false)
      wasOpen.current = false
      onClosedRef.current?.()
    }, timing.light * 1000)
    return () => window.clearTimeout(closeTimer.current)
  }, [open, visible, persistent, timing.light])

  // Measure rows, anchor points and the menu every render while visible; transforms don't affect offsetTop.
  useLayoutEffect(() => {
    if (!visible) return
    const measure = (els: Record<string, HTMLElement | null>) => {
      const out: Record<string, Rect> = {}
      Object.entries(els).forEach(([key, el]) => {
        if (el) out[key] = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }
      })
      return out
    }
    const nextRows = measure(rowEls.current)
    // An anchor point's offset in the menu is its row's offset plus where it sits inside the row. Measured from the
    // two rects, which move together, so a transform on the row doesn't skew it.
    const nextPoints: Record<string, Rect> = {}
    Object.entries(anchorPointEls.current).forEach(([id, el]) => {
      const row = rowEls.current[id]
      if (!el || !row) return
      const inRow = el.getBoundingClientRect().top - row.getBoundingClientRect().top
      nextPoints[id] = { left: 0, top: row.offsetTop + inRow, width: el.offsetWidth, height: el.offsetHeight }
    })
    if (!sameRects(rows, nextRows)) setRows(nextRows)
    if (!sameRects(anchorPoints, nextPoints)) setAnchorPoints(nextPoints)
    const el = menuEl.current
    if (el && (el.offsetWidth !== menuSize.width || el.offsetHeight !== menuSize.height)) {
      setMenuSize({ width: el.offsetWidth, height: el.offsetHeight })
    }
  })

  const transition: DropdownContextValue['transition'] = (props, { dur = timing.content, delay = 0 } = {}) =>
    props.map(p => `${p} ${dur}s ${timing.ease} ${delay}s`).join(', ')

  // 'around' + 'end': the selected item's anchor point sits exactly on the anchor; right edges line up.
  // 'down': the first item's anchor point sits on the anchor instead.
  const selectedPoint = anchorPoints[selectedId]?.top ?? 0
  const firstId = Object.keys(anchorPoints).reduce<string | undefined>(
    (first, id) => (first === undefined || anchorPoints[id].top < anchorPoints[first].top ? id : first),
    undefined,
  )
  const firstPoint = firstId ? anchorPoints[firstId].top : 0
  const menuTop =
    anchorRect && placement === 'around'
      ? anchorRect.top - selectedPoint
      : anchorRect && placement === 'down'
        ? anchorRect.top - firstPoint
        : 0
  const menuRight = anchorRect ? window.innerWidth - anchorRect.right : 0
  const menuRect: Rect = {
    left: window.innerWidth - menuRight - menuSize.width,
    top: menuTop,
    width: menuSize.width,
    height: menuSize.height,
  }

  const selectedRow = rows[selectedId] ?? { left: 0, top: 0, width: 0, height: 0 }
  // Where closed rows gather: the row that sits on the anchor while closed (the first row for 'down').
  const homeRow = (placement === 'down' && firstId ? rows[firstId] : undefined) ?? selectedRow
  const homeCenter = homeRow.top + homeRow.height / 2
  // How far the selected row travels to reach the anchor while closed.
  const travel = placement === 'below' ? -selectedPoint : placement === 'down' ? firstPoint - selectedPoint : 0

  const value: DropdownContextValue = {
    open,
    isOpen,
    visible,
    timing,
    transition,
    anchorRect,
    placement,
    selectedY: menuTop + selectedPoint + (anchorPoints[selectedId]?.height ?? 0) / 2,
    menuRect,
    selectedId,
    menuStyle: {
      position: 'fixed',
      zIndex: DROPDOWN_Z_INDEX,
      right: menuRight,
      top: menuTop,
      pointerEvents: isOpen ? 'auto' : 'none',
      // Glides only while closing (a newly picked row sliding onto the anchor); jumps on open.
      transition: open ? undefined : transition(['top']),
    },
    selectedOffset: selectedPoint,
    selectedTravel: {
      transform: `translateY(${isOpen ? 0 : travel}px)`,
      transition: transition(['opacity', 'transform']),
    },
    rowMotion: key => {
      const row = rows[key] ?? { left: 0, top: 0, width: 0, height: 0 }
      const d = row.top + row.height / 2 - homeCenter
      return {
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'none' : `translateY(${-d * 0.5}px)`,
        filter: isOpen ? 'blur(0px)' : 'blur(10px)',
        transition: transition(['opacity', 'transform', 'filter']),
      }
    },
    lightMotion: (scaleFrom = 0.4) => ({
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? 'scale(1)' : `scale(${scaleFrom})`,
      transition: transition(['opacity', 'transform'], { dur: timing.light }),
    }),
    menuRef: el => {
      menuEl.current = el
    },
    registerRow: key => el => {
      rowEls.current[key] = el
    },
    registerAnchorPoint: id => el => {
      anchorPointEls.current[id] = el
    },
    select: id => onSelect(id as T),
    close: onClose,
    stopPress,
  }

  return (
    <DropdownContext.Provider value={value}>
      {catcher &&
        visible &&
        anchorRect &&
        createPortal(
          // Tap catcher: dismisses the menu. Transparent; the light does the visual work.
          <div
            onClick={e => {
              // Portal events bubble up the React tree, which would reach the anchor's open handler.
              e.stopPropagation()
              onClose()
            }}
            {...stopPress}
            style={{ position: 'fixed', inset: 0, zIndex: DROPDOWN_Z_INDEX, pointerEvents: isOpen ? 'auto' : 'none' }}
          />,
          document.body,
        )}
      {(persistent || (visible && anchorRect)) && children}
    </DropdownContext.Provider>
  )
}

export default Dropdown
