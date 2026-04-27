import { useEffect, useState } from 'react'
import { css, cx } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import CommandSortType from '../@types/CommandSortType'
import CommandsListIcon from './icons/CommandsListIcon'
import FadeTransition from './FadeTransition'
import SortOption from './SortOption'

interface CommandUniverseSortButtonProps {
  onSortChange: (sortOrder: CommandSortType) => void
}

/**
 * Group/sort button used by the Mobile Command Universe dialog. Flush styling (no
 * border or background) with the new 18×18 list glyph.
 *
 * Distinct from SortButton (used by Help / CustomizeToolbar via CommandTable),
 * which keeps the legacy bordered look.
 */
const CommandUniverseSortButton = ({ onSortChange }: CommandUniverseSortButtonProps) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [selectedSort, setSelectedSort] = useState<CommandSortType>('type')

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
    setSelectedSort(sortOrder)
    onSortChange(sortOrder)
    setDropdownOpen(false)
  }

  return (
    <button
      type='button'
      aria-label='Group commands'
      onClick={() => setDropdownOpen(!isDropdownOpen)}
      className={css({
        width: '1.75rem',
        height: '1.75rem',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color: 'fg',
      })}
    >
      <CommandsListIcon size={18} fill={token('colors.fg')} />
      <FadeTransition in={isDropdownOpen} type='fast' unmountOnExit>
        <div
          className={cx(
            css({
              position: 'absolute',
              top: '100%',
              marginTop: '0.444rem',
              right: 0,
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
        </div>
      </FadeTransition>
    </button>
  )
}

export default CommandUniverseSortButton
