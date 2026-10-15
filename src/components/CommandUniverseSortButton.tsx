// PROTOTYPE — visual experiment only, not for merge. A popup-button menu: on open, the selected
// option sits exactly where the button's icon was and the other options unfold above and below it,
// over a fog that dims the dialog and a purple glow behind the menu. The menu renders into the
// dialog's glass sheet (data-glass-sheet in Dialog.tsx) because the page-transition wrapper around
// the search row has overflow: hidden and would clip anything above the row.
import { ComponentType, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import CommandSortType from '../@types/CommandSortType'
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

type Phase = 'closed' | 'open' | 'closing'

const CommandUniverseSortButton = ({ onSortChange }: CommandUniverseSortButtonProps) => {
  const [phase, setPhase] = useState<Phase>('closed')
  const isOpen = phase === 'open'
  const fontSize = useSelector(state => state.fontSize)
  const iconSize = Math.min((28 * fontSize) / DEFAULT_FONT_SIZE, 36)
  const [selectedSort, setSelectedSort] = useState<CommandSortType>('type')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const rowEls = useRef<Record<string, HTMLDivElement | null>>({})
  const [sheet, setSheet] = useState<HTMLElement | null>(null)
  // Button position relative to the glass sheet, measured on open.
  const [anchor, setAnchor] = useState({ top: 0, right: 0, centerY: 0 })
  const [offsets, setOffsets] = useState<Record<string, number>>({})
  const closeTimer = useRef<number>(undefined)

  useLayoutEffect(() => {
    setSheet(wrapperRef.current?.closest<HTMLElement>('[data-glass-sheet]') ?? null)
  }, [])

  // Distance from the top of the menu to each option row (transforms don't affect offsetTop).
  useLayoutEffect(() => {
    const next: Record<string, number> = {}
    OPTIONS.forEach(o => {
      next[o.sort] = rowEls.current[o.sort]?.offsetTop ?? 0
    })
    setOffsets(next)
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
    setPhase('closing')
    closeTimer.current = window.setTimeout(() => setPhase('closed'), MEDIUM_DURATION * 1000)
  }

  const transition = (...props: string[]) => props.map(p => `${p} ${MEDIUM_DURATION}s ${cssEaseOut}`).join(', ')
  const selectedOffset = offsets[selectedSort] ?? 0
  const SelectedIcon = OPTIONS.find(o => o.sort === selectedSort)!.icon

  const menu = sheet
    ? createPortal(
        <div
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
              transition: transition('opacity'),
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
              transition: transition('opacity', 'transform'),
            }}
          />

          {/* Menu column, positioned so the selected option's icon lands exactly on the button. */}
          <div
            className={css({
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              whiteSpace: 'nowrap',
            })}
            style={{
              right: anchor.right,
              top: anchor.top - selectedOffset - ROW_PAD,
              transition: transition('top'),
              // Hidden once fully closed; the button draws the icon again.
              visibility: phase === 'closed' ? 'hidden' : 'visible',
            }}
          >
            <div
              className={css({ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' })}
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                paddingBottom: 4,
                opacity: isOpen ? 1 : 0,
                transform: `translateY(${isOpen ? 0 : selectedOffset * 0.5}px)`,
                transition: transition('opacity', 'transform'),
              }}
            >
              <div
                style={{ width: 60, height: 1, background: 'linear-gradient(to left, rgba(255,255,255,0.35), transparent)' }}
              />
              Sort by…
            </div>

            {OPTIONS.map(({ sort, label, icon: Icon }) => {
              const isSelected = sort === selectedSort
              const color = isSelected ? SELECTED_COLOR : 'rgba(255, 255, 255, 0.85)'
              return (
                <div
                  key={sort}
                  ref={el => {
                    rowEls.current[sort] = el
                  }}
                  onClick={() => {
                    setSelectedSort(sort)
                    onSortChange(sort)
                    close()
                  }}
                  className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.6rem',
                    cursor: 'pointer',
                  })}
                  style={{
                    paddingBlock: ROW_PAD,
                    // The selected row never moves; the others start tucked toward it and fan out as they fade in.
                    opacity: isSelected || isOpen ? 1 : 0,
                    transform: `translateY(${isSelected || isOpen ? 0 : (selectedOffset - (offsets[sort] ?? 0)) * 0.5}px)`,
                    transition: transition('opacity', 'transform'),
                  }}
                >
                  <span
                    className={css({ fontSize: '1.05rem' })}
                    style={{ color, opacity: isOpen ? 1 : 0, transition: transition('opacity', 'color') }}
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
                      transition: transition('opacity'),
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
    </div>
  )
}

export default CommandUniverseSortButton
