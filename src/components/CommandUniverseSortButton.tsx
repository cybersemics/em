import { useCallback, useEffect, useRef, useState } from 'react'
import { css, cx } from '../../styled-system/css'
import CommandSortType from '../@types/CommandSortType'
import useOnClickOutside from '../hooks/useOnClickOutside'
import FadeTransition from './FadeTransition'
import SortOption from './SortOption'
import AToZIcon from './icons/AToZIcon'
import ClockIcon from './icons/ClockIcon'
import CommandsListIcon from './icons/CommandsListIcon'

interface CommandUniverseSortButtonProps {
  /** Currently selected sort. Controlled — the parent (`useCommandList`) owns the value. */
  sortOrder: CommandSortType
  onSortChange: (sortOrder: CommandSortType) => void
}

/**
 * Group/sort button used by the Mobile Command Universe dialog. Flush styling (no
 * border or background) with the new 24×24 list glyph.
 *
 * Controlled component — the displayed glyph and the radio selection are driven by
 * `sortOrder`, so a default flip from the parent (e.g. desktop opening with `'recent'`
 * pre-selected) is reflected here without per-component initial state.
 *
 * Distinct from SortButton (used by Help / CustomizeToolbar via CommandTable),
 * which keeps the legacy bordered look.
 */
const CommandUniverseSortButton = ({ sortOrder: selectedSort, onSortChange }: CommandUniverseSortButtonProps) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeDropdown = useCallback(() => setDropdownOpen(false), [])

  useOnClickOutside(buttonRef, closeDropdown)

  /** Closes the sort dropdown when the user scrolls. */
  const handleScroll = () => {
    setDropdownOpen(false)
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  /** Selects a sort order, propagates the change, and closes the dropdown. */
  const handleSortChange = (sortOrder: CommandSortType) => {
    onSortChange(sortOrder)
    setDropdownOpen(false)
  }

  return (
    <button
      ref={buttonRef}
      type='button'
      aria-label='Group commands'
      onClick={() => setDropdownOpen(!isDropdownOpen)}
      onBlur={closeDropdown}
      className={css({
        border: 'none',
        fontFamily: 'inherit',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        // Keep the button (and the dropdown that fades in within it) above the gesture/text layer.
        zIndex: 'dialog',
        color: 'fg',
        flex: 'none',
        width: '28px',
        height: '28px',
      })}
    >
      {/*
       * `flex: none` cancels iconRecipe's base `flex: 1`, which would otherwise let the
       * glyph grow or shrink to whatever size the flex parent gives it. The wrapping div
       * has explicit size so the icon always renders at its declared size.
       */}
      <div
        className={css({
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          opacity: 0.5,
          // Same plus-lighter blend as the search icon and gradient text so the row
          // reads as one continuous luminous element.
          mixBlendMode: 'plus-lighter',
        })}
      >
        {/* Reflect the active sort mode: A→Z glyph for alphabetical, clock for recent,
            list/group glyph for type. */}
        {selectedSort === 'alphabetical' ? (
          <AToZIcon size={28} fill='#D9D3D5' strokeWidth={0} cssRaw={css.raw({ flex: 'none' })} />
        ) : selectedSort === 'recent' ? (
          <ClockIcon size={28} fill='#D9D3D5' strokeWidth={1.5} cssRaw={css.raw({ flex: 'none' })} />
        ) : (
          <CommandsListIcon size={28} fill='#D9D3D5' strokeWidth={0} cssRaw={css.raw({ flex: 'none' })} />
        )}
      </div>
      <FadeTransition in={isDropdownOpen} type='fast' unmountOnExit>
        <div
          className={cx(
            css({
              position: 'absolute',
              top: '100%',
              marginTop: '0.444rem',
              right: 0,
              // This popover is absolutely positioned inside the 28×28px `position: relative`
              // button, so the button is its containing block. With `right: 0` and no
              // `width`/`left`, the popover's shrink-to-fit width would collapse toward the
              // 28px containing block — wrapping "Recently used" onto two lines and floating
              // its radio out of alignment. `min-width: max-content` sizes the popover to its
              // widest line's intrinsic content instead, so every option stays on one line.
              minWidth: 'max-content',
              backgroundColor: 'darkgray',
              border: 'solid 1px {colors.gray50}',
              borderRadius: '8px',
              zIndex: 'dialog',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.444rem',
            }),
          )}
        >
          <h2
            className={css({
              color: 'gray50',
              borderBottom: 'none',
              textAlign: 'left',
              fontSize: '0.8rem',
              margin: '0',
            })}
          >
            Sort by:
          </h2>
          <SortOption
            sort={'alphabetical'}
            label='Alphabetical'
            selectedSort={selectedSort}
            handleSortChange={handleSortChange}
          />
          <SortOption sort={'type'} label='Type' selectedSort={selectedSort} handleSortChange={handleSortChange} />
          <SortOption
            sort={'recent'}
            label='Recently used'
            selectedSort={selectedSort}
            handleSortChange={handleSortChange}
          />
        </div>
      </FadeTransition>
    </button>
  )
}

export default CommandUniverseSortButton
