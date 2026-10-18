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
import Dropdown from './Dropdown/Dropdown'
import DropdownLight from './Dropdown/DropdownLight'
import DropdownRows, { DropdownAction, DropdownItem } from './Dropdown/DropdownRows'
import AToZIcon from './icons/AToZIcon'
import CommandsListIcon from './icons/CommandsListIcon'

interface CommandUniverseSortButtonProps {
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
  <CommandsListIcon size={size} fill='white' strokeWidth={0} className={css({ flex: 'none' })} />
)

/** Alphabetical glyph, white so the menu's plus-lighter blend can tint it. */
const AlphabeticalIcon = ({ size }: { size: number }) => (
  <AToZIcon size={size} fill='white' strokeWidth={0} className={css({ flex: 'none' })} />
)

const ITEMS: DropdownItem<CommandSortType>[] = [
  { id: 'type', label: 'Type', icon: TypeIcon },
  { id: 'alphabetical', label: 'Alphabetical', icon: AlphabeticalIcon },
]

const CommandUniverseSortButton = ({ onSortChange }: CommandUniverseSortButtonProps) => {
  const dispatch = useDispatch()
  const fontSize = useSelector(state => state.fontSize)
  const iconSize = Math.min((28 * fontSize) / DEFAULT_FONT_SIZE, 36)
  const [selectedSort, setSelectedSort] = useState<CommandSortType>('type')
  const [open, setOpen] = useState(false)
  // True from opening until the close animation finishes, while the menu's copy of the glyph is on screen.
  const [menuShown, setMenuShown] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [surface, setSurface] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setAnchor(buttonRef.current)
    setSurface(buttonRef.current?.closest<HTMLElement>('[data-glass-sheet]') ?? null)
  }, [])

  const actions: DropdownAction[] = [
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

  const SelectedIcon = selectedSort === 'alphabetical' ? AToZIcon : CommandsListIcon

  return (
    <div
      ref={buttonRef}
      role='button'
      aria-label='Group commands'
      onClick={() => {
        setOpen(true)
        setMenuShown(true)
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
      {/* The button's own glyph, hidden while the menu's copy of it is on screen. */}
      <div className={css({ display: 'flex', mixBlendMode: 'plus-lighter' })} style={{ opacity: menuShown ? 0 : 0.5 }}>
        <SelectedIcon size={iconSize} fill={ICON_COLOR} strokeWidth={0} className={css({ flex: 'none' })} />
      </div>
      <Dropdown
        open={open}
        onClose={() => setOpen(false)}
        onClosed={() => setMenuShown(false)}
        onSelect={id => {
          setSelectedSort(id)
          onSortChange(id)
          setOpen(false)
        }}
        anchor={anchor}
        selectedId={selectedSort}
      >
        {/* Light first, so the rows paint over it. */}
        <DropdownLight surface={surface} />
        <DropdownRows heading='Sort by…' items={ITEMS} actions={actions} iconSize={iconSize} />
      </Dropdown>
    </div>
  )
}

export default CommandUniverseSortButton
