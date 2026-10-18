// PROTOTYPE — visual experiment only, not for merge.
//
// GlowMenu: a reusable popup menu lit from its anchor, built from the em design file (Figma node
// 14593:170852, "#2"). When open:
//   - The surface it belongs to (e.g. the Command Universe glass sheet) fades to 20% and is masked by
//     a radial gradient centred under the menu, so the options get clear space.
//   - A light spreads from the anchor: a tint over the surface, Figma's background-glow image and a
//     colour-dodge band (both colour-dodge), and a soft additive bloom spilling a little past the
//     surface's edge. Kept to a few modest layers: full-viewport backdrop filters and blends made
//     opening sluggish and the colour far stronger than the design.
//   - The selected row carries a soft luminosity glow.
//   - Labels are plain white drawn with plus-lighter (Figma "linear dodge"), so they take their
//     lavender tint from the light underneath rather than from a colour of their own.
// The selected row's icon sits exactly on the anchor, so the menu reads as the button opening up.
//
// Every layer is its own fixed element portalled to <body>, so each blends with the whole page
// (a shared fixed wrapper would be a stacking context and isolate the blend modes).
import { CSSProperties, ComponentType, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { MEDIUM_DURATION, SLOW_DURATION, cssEaseOut } from '../Sidebar/constants'

/** A selectable option. The selected one becomes the anchor's glyph. */
export interface GlowMenuItem<T extends string> {
  id: T
  label: string
  icon: ComponentType<{ size: number }>
}

/** A one-shot action below the separator. Never selected; never becomes the anchor. */
export interface GlowMenuAction {
  id: string
  label: string
  icon: ComponentType<{ size: number }>
  onAction: () => void
}

interface GlowMenuProps<T extends string> {
  open: boolean
  /** Called when the user dismisses the menu (tap outside). */
  onClose: () => void
  /** Called once the close animation has finished, so the anchor can draw its own glyph again. */
  onClosed?: () => void
  /** The element the menu opens from. The selected row's icon lands exactly on it. */
  anchor: HTMLElement | null
  /** The surface the menu belongs to. Its in-flow children are dimmed and masked while open. */
  surface: HTMLElement | null
  /** Size of the icon box, matching the anchor so the hand-off is seamless (px). */
  iconSize: number
  heading?: string
  items: GlowMenuItem<T>[]
  selectedId: T
  onSelect: (id: T) => void
  actions?: GlowMenuAction[]
}

/** Above the dialog: the layers are later in <body>, so the same z-index paints over it. */
const Z_INDEX = Number(token('zIndex.dialog'))

/** Vertical padding of each row (px). With a 28px icon this gives the design's 36px row pitch. */
const ROW_PAD = 4
/** The light's duration. Like the sidebar, the light and the rows start together; the light just runs longer. */
const LIGHT_DURATION = SLOW_DURATION
/** Radius of the surface mask (px). Figma's mask ellipse is ~545×605 on a 384px-wide frame. */
const MASK_RADIUS = 575

/** Figma Rectangle 752: the tint across the surface, transparent on the left to #434378 on the right. */
const SURFACE_TINT = 'linear-gradient(90deg, rgba(10, 10, 18, 0) 0%, rgba(67, 67, 120, 1) 100%)'

// Registered so the mask's inner alpha can transition (a gradient itself cannot).
const MASK_PROPERTY_CSS = `@property --glow-menu-mask { syntax: '<number>'; inherits: false; initial-value: 1; }`

/** Injects the @property rule once. */
const useMaskProperty = () => {
  useEffect(() => {
    if (document.getElementById('glow-menu-mask-property')) return
    const style = document.createElement('style')
    style.id = 'glow-menu-mask-property'
    style.textContent = MASK_PROPERTY_CSS
    document.head.appendChild(style)
  }, [])
}

/** A full-viewport fixed layer portalled to <body>. */
const Layer = ({ style, className, children }: { style: CSSProperties; className?: string; children?: ReactNode }) =>
  createPortal(
    <div className={className} style={{ position: 'fixed', pointerEvents: 'none', zIndex: Z_INDEX, ...style }}>
      {children}
    </div>,
    document.body,
  )

/**
 * Stops a press from reaching document-level listeners. The menu lives in <body>, outside the
 * surface it belongs to, so a dialog's click-outside handler (useOnClickOutside listens for
 * mousedown/touchstart on document) would otherwise treat every tap on the menu as a dismissal.
 */
const stopPress = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
  onPointerDown: (e: React.SyntheticEvent) => e.stopPropagation(),
}

const GlowMenu = <T extends string>({
  open,
  onClose,
  onClosed,
  anchor,
  surface,
  iconSize,
  heading,
  items,
  selectedId,
  onSelect,
  actions = [],
}: GlowMenuProps<T>) => {
  useMaskProperty()
  const [visible, setVisible] = useState(false)
  // False for the first frame after mounting, so the layers render in their closed state before
  // switching to open. Without it they mount already open and nothing animates.
  const [entered, setEntered] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [surfaceRect, setSurfaceRect] = useState<DOMRect | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const rowEls = useRef<Record<string, HTMLElement | null>>({})
  const [rows, setRows] = useState<Record<string, { top: number; height: number }>>({})
  const closeTimer = useRef<number>(undefined)
  // Held in a ref so a new callback identity each render doesn't restart the close timer.
  const onClosedRef = useRef(onClosed)
  onClosedRef.current = onClosed

  const duration = MEDIUM_DURATION

  // Measure the anchor and surface each time the menu opens.
  useLayoutEffect(() => {
    if (!open) return
    window.clearTimeout(closeTimer.current)
    if (anchor) setAnchorRect(anchor.getBoundingClientRect())
    if (surface) setSurfaceRect(surface.getBoundingClientRect())
    setVisible(true)
    // Two frames: one to paint the closed state, one to start the transition from it.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [open, anchor, surface])

  // Keep the layers mounted through the close animation, then report back.
  useEffect(() => {
    if (open || !visible) return
    closeTimer.current = window.setTimeout(() => {
      setVisible(false)
      setEntered(false)
      onClosedRef.current?.()
    }, LIGHT_DURATION * 1000)
    return () => window.clearTimeout(closeTimer.current)
  }, [open, visible, duration])

  // Row positions within the menu column (transforms don't affect offsetTop).
  useLayoutEffect(() => {
    if (!visible) return
    const next: Record<string, { top: number; height: number }> = {}
    Object.entries(rowEls.current).forEach(([key, el]) => {
      if (el) next[key] = { top: el.offsetTop, height: el.offsetHeight }
    })
    setRows(next)
  }, [visible, iconSize, items.length, actions.length])

  /** Open for styling purposes: requested open and past the first closed-state frame. */
  const isOpen = open && entered

  const selectedRow = rows[selectedId] ?? { top: 0, height: iconSize + ROW_PAD * 2 }
  const selectedCenter = selectedRow.top + selectedRow.height / 2
  const menuTop = anchorRect ? anchorRect.top - selectedRow.top - ROW_PAD : 0
  const menuRight = anchorRect ? window.innerWidth - anchorRect.right : 0
  const anchorX = anchorRect ? anchorRect.left + anchorRect.width / 2 : 0
  const anchorY = anchorRect ? anchorRect.top + anchorRect.height / 2 : 0
  const menuHeight = menuRef.current?.offsetHeight ?? 0
  const menuWidth = menuRef.current?.offsetWidth ?? 0

  const transition = (props: string[], { delay = 0, dur = duration } = {}) =>
    props.map(p => `${p} ${dur}s ${cssEaseOut} ${delay}s`).join(', ')

  // Dim and mask the surface's in-flow children (the header and the page), centred under the menu.
  useEffect(() => {
    if (!surface || !visible) return
    const centreX = window.innerWidth - menuRight - menuWidth / 2
    const centreY = menuTop + menuHeight / 2
    const children = [...surface.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && getComputedStyle(el).position !== 'absolute',
    )
    children.forEach(el => {
      const r = el.getBoundingClientRect()
      const mask = `radial-gradient(circle ${MASK_RADIUS}px at ${centreX - r.left}px ${centreY - r.top}px, rgba(0, 0, 0, var(--glow-menu-mask)) 9%, black 100%)`
      el.style.maskImage = mask
      el.style.webkitMaskImage = mask
      el.style.transition = transition(['opacity', '--glow-menu-mask'])
      el.style.opacity = isOpen ? '0.2' : '1'
      el.style.setProperty('--glow-menu-mask', isOpen ? '0.06' : '1')
    })
    // The glass's decorative layers (highlights, stroke) are absolute siblings of the content. Their edges are what
    // draw the rounded rectangle, so they fade out; the light should read as one field across the dialog and its
    // surroundings. The first child is the glass fill, which stays.
    ;[...surface.children].forEach(el => {
      if (!(el instanceof HTMLElement) || getComputedStyle(el).position !== 'absolute') return
      if (el === surface.children[0]) return
      el.style.transition = transition(['opacity'])
      el.style.opacity = isOpen ? '0' : ''
    })
    // Make the glass opaque so nothing behind it (e.g. the editor's cursor glow) shows through the cleared space;
    // the colour-dodge layers would otherwise brighten it several times over.
    surface.style.transition = transition(['background-color'])
    surface.style.backgroundColor = isOpen ? 'rgba(12, 12, 22, 0.92)' : ''
  }, [surface, visible, isOpen, menuTop, menuRight, menuWidth, menuHeight])

  // Clear the mask once fully closed so the surface is untouched between uses.
  useEffect(() => {
    if (!surface || visible) return
    ;[...surface.children].forEach(el => {
      if (!(el instanceof HTMLElement)) return
      el.style.maskImage = ''
      el.style.webkitMaskImage = ''
      el.style.removeProperty('--glow-menu-mask')
    })
  }, [surface, visible])

  if (!visible || !anchorRect) return null

  /** Motion for a non-selected row: it wakes (fades in, sharpens, settles out of the selection) together with the light. */
  const rowMotion = (key: string): CSSProperties => {
    const row = rows[key] ?? { top: 0, height: 0 }
    const d = row.top + row.height / 2 - selectedCenter
    return {
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? 'none' : `translateY(${-d * 0.5}px)`,
      filter: isOpen ? 'blur(0px)' : 'blur(10px)',
      transition: transition(['opacity', 'transform', 'filter']),
    }
  }

  /** The light's own motion: grows out of the anchor. */
  const lightMotion = (scaleFrom = 0.4): CSSProperties => ({
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? 'scale(1)' : `scale(${scaleFrom})`,
    transition: transition(['opacity', 'transform'], {
      dur: LIGHT_DURATION,
    }),
  })

  const register = (key: string) => (el: HTMLElement | null) => {
    rowEls.current[key] = el
  }

  const rowClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    cursor: 'pointer',
    fontFamily: 'radioCanada',
    fontSize: '17.75px',
    lineHeight: '1.5',
    letterSpacing: '-0.011em',
    color: 'white',
  })

  const sr = surfaceRect

  return (
    <>
      {/* Tap catcher: dismisses the menu. Transparent; the light does the visual work. */}
      {createPortal(
        <div
          onClick={e => {
            // Portal events bubble up the React tree, which would reach the anchor's open handler.
            e.stopPropagation()
            onClose()
          }}
          {...stopPress}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: Z_INDEX,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        />,
        document.body,
      )}

      {/* Surface tint (Figma Rectangle 752): fill 35% × layer 80%, over the surface's rounded rect. */}
      {sr && (
        <Layer
          style={{
            left: sr.left,
            top: sr.top,
            width: sr.width,
            height: sr.height,
            borderRadius: 28,
            background: SURFACE_TINT,
            // Feathered so its rounded edge doesn't redraw the dialog's outline.
            maskImage: 'radial-gradient(ellipse 70% 60% at 70% 30%, black 40%, transparent 100%)',
            opacity: isOpen ? 0.28 : 0,
            transition: transition(['opacity'], { dur: LIGHT_DURATION }),
          }}
        />
      )}

      {/* Background glow (Figma "Background glow" image, inside the colour-dodge frame): a soft, shapeless lavender
          field over the surface, bleeding slightly past its edges so the glass edge doesn't read as a boundary.
          Exported from Figma. Kept faint: in Figma the frame's other layers temper it. */}
      {sr && (
        <Layer
          style={{
            left: sr.left - 16,
            top: sr.top - 16,
            width: sr.width + 32,
            height: sr.height + 32,
            backgroundImage: 'url(/img/glow-menu/background-glow.png)',
            backgroundSize: '100% 100%',
            mixBlendMode: 'color-dodge',
            maskImage: 'radial-gradient(ellipse 75% 70% at 65% 30%, black 35%, transparent 100%)',
            opacity: isOpen ? 0.22 : 0,
            transition: transition(['opacity'], { dur: LIGHT_DURATION }),
          }}
        />
      )}

      {/* Colour-dodge band (inside Figma's dodge frame): the right side of the surface, brightening toward the menu.
          No backdrop blur: over this much area it made opening the menu sluggish. */}
      {sr && (
        <Layer
          style={{
            left: sr.left + sr.width * 0.17,
            top: sr.top,
            width: sr.width * 0.83 + 12,
            height: sr.height,
            background: SURFACE_TINT,
            maskImage:
              'linear-gradient(to right, transparent, black 45%), linear-gradient(to bottom, black 55%, transparent)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in',
            mixBlendMode: 'color-dodge',
            opacity: isOpen ? 0.5 : 0,
            transition: transition(['opacity'], { dur: LIGHT_DURATION }),
          }}
        />
      )}

      {/* Bloom centred on the anchor (Figma "CC glow" under a radial mask): a soft lavender light, additive, mostly
          within the surface with a little spill past its top-right corner. */}
      <Layer
        style={{
          left: anchorX - 380,
          top: anchorY - 380,
          width: 760,
          height: 760,
          borderRadius: '50%',
          background:
            'radial-gradient(closest-side, rgba(120, 105, 225, 0.3) 0%, rgba(100, 88, 210, 0.17) 35%, rgba(70, 65, 170, 0.05) 70%, rgba(44, 44, 133, 0) 100%)',
          mixBlendMode: 'plus-lighter',
          ...lightMotion(0.3),
        }}
      />

      {/* Selection glow (Figma "Selection highlight"): a soft ellipse behind the selected row. Figma uses an image fill
          with a luminosity blend; a white stand-in at luminosity bleaches everything, so this is a faint additive lavender. */}
      <Layer
        style={{
          left: anchorRect.right + 43 - 286,
          top: anchorY - 35,
          width: 286,
          height: 70,
          background: 'radial-gradient(closest-side, rgba(170, 160, 255, 1), rgba(170, 160, 255, 0))',
          filter: 'blur(25px)',
          mixBlendMode: 'plus-lighter',
          opacity: isOpen ? 0.14 : 0,
          transition: transition(['opacity'], { dur: LIGHT_DURATION }),
        }}
      />

      {/* The menu. plus-lighter on the whole column adds its white text onto the light below. */}
      {createPortal(
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          {...stopPress}
          className={css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', whiteSpace: 'nowrap' })}
          style={{
            position: 'fixed',
            zIndex: Z_INDEX,
            right: menuRight,
            top: menuTop,
            mixBlendMode: 'plus-lighter',
            pointerEvents: isOpen ? 'auto' : 'none',
            // Glides only while closing (a newly picked row sliding onto the anchor); jumps on open.
            transition: open ? undefined : transition(['top']),
          }}
        >
          {heading && (
            <div
              ref={register('heading')}
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                fontFamily: 'radioCanada',
                fontSize: '18px',
                fontWeight: 500,
                lineHeight: '1.5',
                letterSpacing: '-0.011em',
                color: 'white',
              })}
              style={{ paddingBottom: 6, ...rowMotion('heading') }}
            >
              {/* Figma Line 47: 99px, white fading out to the left, 32%. */}
              <div
                style={{
                  width: 99,
                  height: 1,
                  opacity: 0.32,
                  background: 'linear-gradient(to left, white, rgba(255, 255, 255, 0))',
                }}
              />
              <span style={{ opacity: 0.65 }}>{heading}</span>
            </div>
          )}

          {items.map(({ id, label, icon: Icon }) => {
            const isSelected = id === selectedId
            return (
              <div
                key={id}
                ref={register(id)}
                onClick={() => onSelect(id)}
                className={rowClass}
                style={{
                  paddingBlock: ROW_PAD,
                  // The selected row never moves within the menu; the menu's top carries it onto the anchor.
                  ...(isSelected ? { transition: transition(['opacity']) } : rowMotion(id)),
                }}
              >
                {/* Selected 60%, others 34% (Figma row opacities). */}
                <span
                  style={{
                    opacity: isOpen ? (isSelected ? 0.6 : 0.34) : 0,
                    transition: transition(['opacity']),
                  }}
                >
                  {label}
                </span>
                <div
                  className={css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })}
                  style={{
                    width: iconSize,
                    height: iconSize,
                    // Icons at 75% of the row; closed, matches the anchor glyph's 50%.
                    opacity: isOpen ? (isSelected ? 0.6 : 0.34) * 0.75 * 1.6 : 0.5,
                    transition: transition(['opacity']),
                  }}
                >
                  <Icon size={iconSize} />
                </div>
              </div>
            )
          })}

          {actions.length > 0 && (
            <>
              <div
                ref={register('separator')}
                style={{
                  width: '100%',
                  height: 1,
                  marginBlock: 6,
                  background: 'linear-gradient(to left, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0))',
                  ...rowMotion('separator'),
                }}
              />
              {actions.map(({ id, label, icon: Icon, onAction }) => (
                <div
                  key={id}
                  ref={register(id)}
                  onClick={() => {
                    onClose()
                    onAction()
                  }}
                  className={rowClass}
                  style={{ paddingBlock: ROW_PAD, ...rowMotion(id) }}
                >
                  <span style={{ opacity: 0.34 }}>{label}</span>
                  <div
                    className={css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })}
                    style={{ width: iconSize, height: iconSize, opacity: 0.4 }}
                  >
                    <Icon size={iconSize * 0.85} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

export default GlowMenu
