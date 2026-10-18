// PROTOTYPE — visual experiment only, not for merge. A popup-button menu: on open, the selected
// option sits exactly where the button's icon was and the rest of the menu emerges around it,
// over a fog that dims the dialog and a purple glow behind the menu. The menu renders into the
// dialog's glass sheet (data-glass-sheet in Dialog.tsx) because the page-transition wrapper around
// the search row has overflow: hidden and would clip anything above the row.
//
// A floating debug panel (bottom of the screen) switches between several open/close motions, so
// they can be compared on the same screen. The choice is remembered in localStorage.
import { CSSProperties, ComponentType, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import CommandSortType from '../@types/CommandSortType'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../actions/toggleMobileCommandUniverse'
import { DEFAULT_FONT_SIZE } from '../constants'
import { MEDIUM_DURATION, cssEaseOut } from './Sidebar/constants'
import AToZIcon from './icons/AToZIcon'
import CommandsListIcon from './icons/CommandsListIcon'

interface CommandUniverseSortButtonProps {
  onSortChange: (sortOrder: CommandSortType) => void
}

const OPTIONS: {
  sort: CommandSortType
  label: string
  icon: ComponentType<{ size?: number; fill?: string; strokeWidth?: number; className?: string }>
}[] = [
  { sort: 'type', label: 'Type', icon: CommandsListIcon },
  { sort: 'alphabetical', label: 'Alphabetical', icon: AToZIcon },
]

/** Vertical padding of each option row (px). */
const ROW_PAD = 6

/** Lavender used for the selected option, from the design. */
const SELECTED_COLOR = '#B9AEF5'
const ICON_COLOR = '#D9D3D5'
const TEXT_COLOR = 'rgba(255, 255, 255, 0.85)'

type Phase = 'closed' | 'open' | 'closing'

/** The motions the debug panel switches between. */
const MOTIONS = {
  light: 'Light reveal',
  squeeze: 'Squeeze',
  stagger: 'Squeeze + stagger',
  spring: 'Squeeze + spring',
  scale: 'Scale from selection',
  curtain: 'Curtain reveal',
  blur: 'Out of focus',
  glow: 'Glow first',
  slide: 'Rigid slide',
} as const
type Motion = keyof typeof MOTIONS

const MOTION_KEY = 'sortMenuPrototype.motion'
const SLOWMO_KEY = 'sortMenuPrototype.slowmo'

/** Reads a localStorage value; storage can be unavailable, so fall back quietly. */
const load = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Writes a localStorage value; storage can be unavailable, so ignore failures. */
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** Overshooting curve for the spring variant (opening only; overshoot on the way out looks wrong). */
const SPRING_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
/** Per-step delay for the stagger variant (s). */
const STAGGER_STEP = 0.04
/** How long the light reveal's glow takes to reach the farthest row (s). */
const LIGHT_SPREAD = 0.18
/** How far the glow leads the rows in the glow-first variant (s). */
const GLOW_LEAD = 0.1

/** Sliders glyph for Customize Toolbar. Inline because the prototype only needs a placeholder. */
const CustomizeIcon = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth={1.3}
    strokeLinecap='round'
  >
    <path d='M4 7h10M18 7h2M4 17h2M10 17h10' />
    <circle cx='16' cy='7' r='2' />
    <circle cx='8' cy='17' r='2' />
  </svg>
)

/** Pop-out-of-window glyph for Undock. */
const UndockIcon = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth={1.3}
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M13 4h7v7M20 4l-8 8M11 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5' />
  </svg>
)

/** Floating panel for picking the motion and toggling slow motion. Stops its events so taps never reach the dialog or the menu. */
const MotionDebugPanel = ({
  motion,
  setMotion,
  slowmo,
  setSlowmo,
}: {
  motion: Motion
  setMotion: (m: Motion) => void
  slowmo: boolean
  setSlowmo: (s: boolean) => void
}) =>
  createPortal(
    <div
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      className={css({
        position: 'fixed',
        left: '8px',
        right: '8px',
        bottom: 'calc(8px + env(safe-area-inset-bottom))',
        zIndex: 100000,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '8px',
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: 'white',
      })}
    >
      {(Object.keys(MOTIONS) as Motion[]).map(m => (
        <button
          key={m}
          onClick={() => setMotion(m)}
          className={css({ padding: '5px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer' })}
          style={{
            background: m === motion ? SELECTED_COLOR : 'rgba(255, 255, 255, 0.12)',
            color: m === motion ? 'black' : 'white',
          }}
        >
          {MOTIONS[m]}
        </button>
      ))}
      <button
        onClick={() => setSlowmo(!slowmo)}
        className={css({ padding: '5px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer' })}
        style={{ background: slowmo ? '#F5C66E' : 'rgba(255, 255, 255, 0.12)', color: slowmo ? 'black' : 'white' }}
      >
        Slow-mo ×4
      </button>
    </div>,
    document.body,
  )

const CommandUniverseSortButton = ({ onSortChange }: CommandUniverseSortButtonProps) => {
  const dispatch = useDispatch()
  const [phase, setPhase] = useState<Phase>('closed')
  const isOpen = phase === 'open'
  const fontSize = useSelector(state => state.fontSize)
  const iconSize = Math.min((28 * fontSize) / DEFAULT_FONT_SIZE, 36)
  const [selectedSort, setSelectedSort] = useState<CommandSortType>('type')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const rowEls = useRef<Record<string, HTMLDivElement | null>>({})
  const [sheet, setSheet] = useState<HTMLElement | null>(null)
  // Button position relative to the glass sheet, measured on open.
  const [anchor, setAnchor] = useState({ top: 0, right: 0, centerY: 0 })
  // Each menu row's top and height within the menu column (transforms don't affect offsetTop).
  const [layout, setLayout] = useState<{ rows: Record<string, { top: number; height: number }>; height: number }>({
    rows: {},
    height: 0,
  })
  const closeTimer = useRef<number>(undefined)

  const [motion, setMotionState] = useState<Motion>(() => {
    const stored = load(MOTION_KEY)
    return stored && stored in MOTIONS ? (stored as Motion) : 'light'
  })
  const [slowmo, setSlowmoState] = useState(() => load(SLOWMO_KEY) === 'true')
  const setMotion = (m: Motion) => {
    setMotionState(m)
    save(MOTION_KEY, m)
  }
  const setSlowmo = (s: boolean) => {
    setSlowmoState(s)
    save(SLOWMO_KEY, String(s))
  }

  const duration = MEDIUM_DURATION * (slowmo ? 4 : 1)

  useLayoutEffect(() => {
    setSheet(wrapperRef.current?.closest<HTMLElement>('[data-glass-sheet]') ?? null)
  }, [])

  useLayoutEffect(() => {
    const rows: Record<string, { top: number; height: number }> = {}
    Object.entries(rowEls.current).forEach(([key, el]) => {
      if (el) rows[key] = { top: el.offsetTop, height: el.offsetHeight }
    })
    setLayout({ rows, height: menuRef.current?.offsetHeight ?? 0 })
  }, [sheet, iconSize])

  /** Measures the button against the sheet and opens the menu on top of it. */
  const open = () => {
    if (!sheet || !wrapperRef.current) return
    window.clearTimeout(closeTimer.current)
    const s = sheet.getBoundingClientRect()
    const b = wrapperRef.current.getBoundingClientRect()
    setAnchor({ top: b.top - s.top, right: s.right - b.right, centerY: b.top - s.top + b.height / 2 })
    setPhase('open')
  }

  /** Folds the menu back onto the button, then hands the icon back to the button. */
  const close = () => {
    // Only one pending hand-off at a time; an orphaned timer would later shut a menu reopened in the meantime.
    window.clearTimeout(closeTimer.current)
    setPhase('closing')
    // Leave room for the longest stagger/lead before handing the icon back.
    closeTimer.current = window.setTimeout(() => setPhase('closed'), (duration + 0.2 * (slowmo ? 4 : 1)) * 1000)
  }

  /** Builds a transition string for the given properties, with optional delay and easing. */
  const transition = (props: string[], { delay = 0, ease = cssEaseOut, dur = duration } = {}) =>
    props.map(p => `${p} ${dur}s ${ease} ${delay}s`).join(', ')

  const selectedRow = layout.rows[selectedSort] ?? { top: 0, height: 0 }
  const selectedCenter = selectedRow.top + selectedRow.height / 2
  const SelectedIcon = OPTIONS.find(o => o.sort === selectedSort)!.icon

  // Rank of each row by distance from the selection, for the stagger variant (0 = adjacent).
  const rowKeys = Object.keys(layout.rows).sort((a, b) => layout.rows[a].top - layout.rows[b].top)
  const selectedIndex = rowKeys.indexOf(selectedSort)
  const maxRank = Math.max(1, ...rowKeys.map((_, i) => Math.abs(i - selectedIndex)))
  // Farthest any row sits from the selection, for the light reveal (px).
  const maxDistance = Math.max(
    1,
    ...rowKeys.map(k => Math.abs(layout.rows[k].top + layout.rows[k].height / 2 - selectedCenter)),
  )
  const slow = slowmo ? 4 : 1

  /**
   * Style for a non-selected row (or the heading/separator/actions): where it rests while hidden
   * and how it travels to its place. Every variant except the rigid slide starts the row tucked
   * toward the selection; they differ in what else happens along the way.
   */
  const rowMotion = (key: string): CSSProperties => {
    const row = layout.rows[key] ?? { top: 0, height: 0 }
    // Signed distance from the selection to this row's centre.
    const d = row.top + row.height / 2 - selectedCenter
    const rank = Math.max(0, Math.abs(rowKeys.indexOf(key) - selectedIndex) - 1)
    const squeeze = `translateY(${-d * 0.5}px)`

    switch (motion) {
      case 'stagger': {
        // Opening: nearest rows first. Closing: outermost rows first, so the menu ripples back in.
        const delay = (isOpen ? rank : maxRank - 1 - rank) * STAGGER_STEP * (slowmo ? 4 : 1)
        return {
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : squeeze,
          transition: transition(['opacity', 'transform'], { delay: Math.max(0, delay) }),
        }
      }
      case 'spring':
        return {
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : `translateY(${-d * 0.7}px)`,
          transition: isOpen
            ? `${transition(['transform'], { ease: SPRING_EASE, dur: duration * 1.4 })}, ${transition(['opacity'])}`
            : transition(['opacity', 'transform']),
        }
      case 'scale':
        // Collapsed flat onto the selection and stretched back out, like a native popup menu growing from its item.
        return {
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : `translateY(${-d * 0.85}px) scaleY(0.15)`,
          transition: transition(['opacity', 'transform']),
        }
      case 'curtain':
        // Rows don't move; the menu's clip-path does the revealing (see menuClip).
        return { opacity: isOpen ? 1 : 0, transition: transition(['opacity'], { dur: duration * 0.6 }) }
      case 'light': {
        // The glow expands from the selection over LIGHT_SPREAD; each row wakes (fades in, sharpens,
        // settles) when the edge of the light reaches it, so nearer rows wake first. Closing reverses
        // it: outer rows dim first, then the light withdraws.
        const reach = Math.abs(d) / maxDistance
        const delay = (isOpen ? reach : 1 - reach) * LIGHT_SPREAD * slow
        return {
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : squeeze,
          filter: isOpen ? 'blur(0px)' : 'blur(10px)',
          transition: transition(['opacity', 'transform', 'filter'], { delay }),
        }
      }
      case 'blur':
        return {
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : squeeze,
          filter: isOpen ? 'blur(0px)' : 'blur(8px)',
          transition: transition(['opacity', 'transform', 'filter']),
        }
      case 'glow':
        // Rows trail the glow on the way in, and leave ahead of it on the way out.
        return {
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : squeeze,
          transition: transition(['opacity', 'transform'], { delay: isOpen ? GLOW_LEAD * (slowmo ? 4 : 1) : 0 }),
        }
      case 'slide':
        return { opacity: isOpen ? 1 : 0, transition: transition(['opacity']) }
      default:
        return {
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'none' : squeeze,
          transition: transition(['opacity', 'transform']),
        }
    }
  }

  // Curtain: while hidden, the menu is clipped to the selected row's band, and opens up and down from it.
  const menuClip: CSSProperties =
    motion === 'curtain'
      ? {
          clipPath: isOpen
            ? 'inset(-40px -400px -40px -400px)'
            : `inset(${selectedRow.top}px -400px ${Math.max(0, layout.height - selectedRow.top - selectedRow.height)}px -400px)`,
        }
      : {}

  const glowDelay =
    motion === 'glow' && !isOpen ? GLOW_LEAD * slow : motion === 'light' && !isOpen ? LIGHT_SPREAD * 0.6 * slow : 0
  // In the light reveal the glow is the thing doing the revealing, so it spreads over the whole reveal.
  const glowDuration = motion === 'light' ? duration + LIGHT_SPREAD * slow : duration

  /** Ref callback that registers a row for measurement. */
  const registerRow = (key: string) => (el: HTMLDivElement | null) => {
    rowEls.current[key] = el
  }

  const rowClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.6rem',
    cursor: 'pointer',
  })

  const menu = sheet
    ? createPortal(
        <div
          // React bubbles portal events up the component tree, so without this a tap on the menu would
          // also reach the button's toggle.
          onClick={e => e.stopPropagation()}
          className={css({ position: 'absolute', inset: 0, zIndex: 'dialog' })}
          style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          {/* Fog: dims and blurs the whole dialog, header included. Tapping it closes the menu. */}
          <div
            onClick={close}
            className={css({ position: 'absolute', inset: 0, backdropFilter: 'blur(10px)' })}
            style={{
              backgroundColor: 'rgba(14, 12, 24, 0.72)',
              opacity: isOpen ? 1 : 0,
              transition: transition(['opacity']),
            }}
          />

          {/* Glow behind the menu, blooming out from the selected row. */}
          <div
            className={css({ position: 'absolute', pointerEvents: 'none', borderRadius: '50%', filter: 'blur(24px)' })}
            style={{
              width: 340,
              height: 300,
              right: anchor.right - 70,
              top: anchor.centerY - 150,
              background:
                'radial-gradient(closest-side, rgba(150, 130, 255, 0.55), rgba(110, 95, 230, 0.28) 55%, rgba(90, 80, 200, 0) 100%)',
              mixBlendMode: 'screen',
              opacity: isOpen ? 1 : 0,
              transform: `scale(${isOpen ? 1 : 0.4})`,
              transition: transition(['opacity', 'transform'], { delay: glowDelay, dur: glowDuration }),
            }}
          />

          {/* Menu column, positioned so the selected option's icon lands exactly on the button. */}
          <div
            ref={menuRef}
            className={css({
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              whiteSpace: 'nowrap',
            })}
            style={{
              right: anchor.right,
              top: anchor.top - selectedRow.top - ROW_PAD,
              // top only glides while closing (a newly picked row sliding onto the button). On open it
              // must jump, or the menu would slide in from wherever it was last measured.
              transition: transition(phase === 'closing' ? ['top', 'clip-path'] : ['clip-path']),
              // Hidden once fully closed; the button draws the icon again.
              visibility: phase === 'closed' ? 'hidden' : 'visible',
              ...menuClip,
            }}
          >
            <div
              ref={registerRow('heading')}
              className={css({ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' })}
              style={{ color: TEXT_COLOR, paddingBottom: 4, ...rowMotion('heading') }}
            >
              <div
                style={{
                  width: 60,
                  height: 1,
                  background: 'linear-gradient(to left, rgba(255,255,255,0.35), transparent)',
                }}
              />
              Sort by…
            </div>

            {OPTIONS.map(({ sort, label, icon: Icon }) => {
              const isSelected = sort === selectedSort
              return (
                <div
                  key={sort}
                  ref={registerRow(sort)}
                  onClick={() => {
                    setSelectedSort(sort)
                    onSortChange(sort)
                    close()
                  }}
                  className={rowClass}
                  style={{
                    paddingBlock: ROW_PAD,
                    // The selected row never moves within the menu; the menu's top carries it onto the button.
                    ...(isSelected ? { transition: transition(['opacity']) } : rowMotion(sort)),
                  }}
                >
                  <span
                    className={css({ fontSize: '1.05rem' })}
                    style={{
                      color: isSelected ? SELECTED_COLOR : TEXT_COLOR,
                      opacity: isOpen ? 1 : 0,
                      transition: transition(['opacity', 'color']),
                    }}
                  >
                    {label}
                  </span>
                  <div
                    className={css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })}
                    style={{
                      width: iconSize,
                      height: iconSize,
                      // Matches the button glyph (0.5 over plus-lighter) when closed, so the hand-off is invisible.
                      opacity: isOpen ? 1 : 0.5,
                      mixBlendMode: isOpen ? 'normal' : 'plus-lighter',
                      transition: transition(['opacity']),
                    }}
                  >
                    <Icon
                      size={iconSize}
                      fill={isOpen && isSelected ? SELECTED_COLOR : ICON_COLOR}
                      strokeWidth={0}
                      className={css({ flex: 'none' })}
                    />
                  </div>
                </div>
              )
            })}

            {/* Separator, then actions. Actions aren't selectable: they never take the lavender
                highlight and never become the button. */}
            <div
              ref={registerRow('separator')}
              style={{
                width: '100%',
                height: 1,
                marginBlock: 6,
                background: 'linear-gradient(to left, rgba(255,255,255,0.3), rgba(255,255,255,0.05))',
                ...rowMotion('separator'),
              }}
            />
            {[
              {
                key: 'customize',
                label: 'Customize Toolbar',
                icon: CustomizeIcon,
                action: () => {
                  dispatch(toggleMobileCommandUniverse({ value: false }))
                  dispatch(showModal({ id: 'customizeToolbar' }))
                },
              },
              // Placeholder: no undock behavior exists yet, so this just closes the menu.
              { key: 'undock', label: 'Undock', icon: UndockIcon, action: () => {} },
            ].map(({ key, label, icon: Icon, action }) => (
              <div
                key={key}
                ref={registerRow(key)}
                onClick={() => {
                  close()
                  action()
                }}
                className={rowClass}
                style={{ paddingBlock: ROW_PAD, ...rowMotion(key) }}
              >
                <span className={css({ fontSize: '1.05rem' })} style={{ color: TEXT_COLOR }}>
                  {label}
                </span>
                <div
                  className={css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })}
                  style={{ width: iconSize, height: iconSize }}
                >
                  <Icon size={iconSize * 0.85} color={ICON_COLOR} />
                </div>
              </div>
            ))}
          </div>
        </div>,
        sheet,
      )
    : null

  return (
    <div
      ref={wrapperRef}
      role='button'
      aria-label='Group commands'
      onClick={() => (isOpen ? close() : open())}
      className={css({
        position: 'relative',
        flex: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      })}
      style={{ width: iconSize, height: iconSize }}
    >
      {/* The button's own glyph, hidden while the menu's copy of it is on screen. */}
      <div
        className={css({ display: 'flex', mixBlendMode: 'plus-lighter' })}
        style={{ opacity: phase === 'closed' ? 0.5 : 0 }}
      >
        <SelectedIcon size={iconSize} fill={ICON_COLOR} strokeWidth={0} className={css({ flex: 'none' })} />
      </div>
      {menu}
      <MotionDebugPanel motion={motion} setMotion={setMotion} slowmo={slowmo} setSlowmo={setSlowmo} />
    </div>
  )
}

export default CommandUniverseSortButton
