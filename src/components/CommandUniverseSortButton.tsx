// PROTOTYPE — visual experiment only, not for merge. The Command Universe sort button, opening a
// Dropdown (see Dropdown/) lit from the button. The menu's selected row sits on the button, so the
// button hides its own glyph while the menu is on screen.
import { useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import CommandSortType from '../@types/CommandSortType'
import { showModalActionCreator as showModal } from '../actions/showModal'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../actions/toggleMobileCommandUniverse'
import { DEFAULT_FONT_SIZE } from '../constants'
import useBreakpoint from '../hooks/useBreakpoint'
import durations from '../util/durations'
import Dropdown, { DropdownPlacement, EASE } from './Dropdown/Dropdown'
import DropdownLight from './Dropdown/DropdownLight'
import DropdownRows, { DropdownAction, DropdownItem } from './Dropdown/DropdownRows'
import useDialsVersion, { readDial } from './Dropdown/dials'
import AToZIcon from './icons/AToZIcon'
import ClockIcon from './icons/ClockIcon'
import CommandsListIcon from './icons/CommandsListIcon'

interface CommandUniverseSortButtonProps {
  /** Currently selected sort. Controlled — the parent (`useCommandList`) owns the value. */
  sortOrder: CommandSortType
  onSortChange: (sortOrder: CommandSortType) => void
}

const ICON_COLOR = '#D9D3D5'

/** Sliders glyph for Customize Toolbar. Inline because the prototype only needs a placeholder. */
const CustomizeIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='white'
    strokeWidth={1.3}
    strokeLinecap='round'
  >
    <path d='M4 7h10M18 7h2M4 17h2M10 17h10' />
    <circle cx='16' cy='7' r='2' />
    <circle cx='8' cy='17' r='2' />
  </svg>
)

/** Pop-out-of-window glyph for Undock. */
const UndockIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='white'
    strokeWidth={1.3}
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M13 4h7v7M20 4l-8 8M11 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5' />
  </svg>
)

/** Type glyph, white so the menu's plus-lighter blend can tint it. */
const TypeIcon = ({ size }: { size: number }) => (
  <CommandsListIcon size={size} fill='white' strokeWidth={0} cssRaw={css.raw({ flex: 'none' })} />
)

/** Alphabetical glyph, white so the menu's plus-lighter blend can tint it. */
const AlphabeticalIcon = ({ size }: { size: number }) => (
  <AToZIcon size={size} fill='white' strokeWidth={0} cssRaw={css.raw({ flex: 'none' })} />
)

/** Recently used glyph, white so the menu's plus-lighter blend can tint it. */
const RecentIcon = ({ size }: { size: number }) => (
  <ClockIcon size={size} fill='white' strokeWidth={1.5} cssRaw={css.raw({ flex: 'none' })} />
)

const ITEMS: DropdownItem<CommandSortType>[] = [
  { id: 'type', label: 'Type', icon: TypeIcon },
  { id: 'alphabetical', label: 'Alphabetical', icon: AlphabeticalIcon },
  { id: 'recent', label: 'Recently used', icon: RecentIcon },
]

const CommandUniverseSortButton = ({ sortOrder }: CommandUniverseSortButtonProps) => {
  const dispatch = useDispatch()
  const fontSize = useSelector(state => state.fontSize)
  const iconSize = Math.min((28 * fontSize) / DEFAULT_FONT_SIZE, 36)
  // PROTOTYPE: the pick stays inside the dropdown and the Command Universe list isn't re-sorted (onSortChange is not
  // called). The prototype is about the dropdown; re-sorting the list is a 100ms+ render that disturbed its animation.
  const [selectedSort, setSelectedSort] = useState<CommandSortType>(sortOrder)
  const [open, setOpen] = useState(false)
  // The Command Universe switches to its desktop layout at md (400px).
  const isDesktop = useBreakpoint('md')
  const buttonRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [surface, setSurface] = useState<HTMLElement | null>(null)
  // Design dial: whether the menu opens around the selection or drops down from the button.
  useDialsVersion()
  // 'down-fade': drops down, and only the selected item moves; the others fade in where they are.
  const opening = readDial('--sort-dropdown-placement', 'down-fade')
  const placement: DropdownPlacement = opening === 'around' ? 'around' : 'down'

  useLayoutEffect(() => {
    setAnchor(buttonRef.current)
    setSurface(buttonRef.current?.closest<HTMLElement>('[data-cu-glass-sheet]') ?? null)
  }, [])

  // Customize Toolbar and Undock belong to the desktop Command Universe; mobile shows only the sort options.
  const actions: DropdownAction[] = isDesktop
    ? [
        {
          id: 'customize',
          label: 'Customize Toolbar',
          icon: CustomizeIcon,
          onAction: () => {
            dispatch(toggleMobileCommandUniverse({ value: false }))
            dispatch(showModal({ id: 'customizeToolbar' }))
          },
        },
        // Placeholder: no undock behavior exists yet, so this just closes the menu.
        { id: 'undock', label: 'Undock', icon: UndockIcon, onAction: () => {} },
      ]
    : []

  const SelectedIcon =
    selectedSort === 'alphabetical' ? AToZIcon : selectedSort === 'recent' ? ClockIcon : CommandsListIcon

  return (
    <div
      ref={buttonRef}
      role='button'
      aria-label='Group commands'
      onClick={() => {
        setOpen(true)
      }}
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
      {/* The button's own glyph. Hidden at once while the menu opens (the menu's copy takes its place). Closing, the
          menu's copy slides home first, then the two crossfade in place, so the glyph settles at its resting colour
          instead of snapping from the menu's lit white to grey when the menu unmounts. */}
      <div
        className={css({ display: 'flex', mixBlendMode: 'plus-lighter' })}
        style={{
          opacity: open ? 0 : 0.5,
          // Waits for the menu's copy to slide home, then crossfades with it in place, on the same curve as its fade-out
          // so the two always add up to the resting 50% (both blend additively).
          transition: open ? 'none' : `opacity ${durations.get('medium')}ms ${EASE} ${durations.get('medium')}ms`,
        }}
      >
        <SelectedIcon
          size={iconSize}
          fill={ICON_COLOR}
          strokeWidth={selectedSort === 'recent' ? 1.5 : 0}
          cssRaw={css.raw({ flex: 'none' })}
        />
      </div>
      <Dropdown
        open={open}
        onClose={() => setOpen(false)}
        // The Dropdown closes itself after a pick.
        onSelect={setSelectedSort}
        anchor={anchor}
        selectedId={selectedSort}
        placement={placement}
        rowEntrance={opening === 'down-fade' ? 'fade' : 'settle'}
      >
        {/* Light first, so the rows paint over it. */}
        <DropdownLight surface={surface} />
        <DropdownRows heading='Sort by…' items={ITEMS} actions={actions} iconSize={iconSize} />
      </Dropdown>
    </div>
  )
}

export default CommandUniverseSortButton
