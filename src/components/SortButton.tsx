import { useEffect, useState } from 'react'
import { css, cx } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import CommandSortType from '../@types/CommandSortType'
import FadeTransition from './FadeTransition'
import SortOption from './SortOption'
import CommandsListIcon from './icons/CommandsListIcon'

interface SortButtonProps {
  onSortChange: (sortOrder: CommandSortType) => void
}

/**
 * SortButton component.
 * */
const SortButton = ({ onSortChange }: SortButtonProps) => {
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

  /**
   * Handles the sort change.
   */
  const handleSortChange = (sortOrder: CommandSortType) => {
    setSelectedSort(sortOrder)
    onSortChange(sortOrder)
    setDropdownOpen(false)
  }

  return (
    <button
      onClick={() => setDropdownOpen(!isDropdownOpen)}
      className={css({
        // Borderless icon button so the row reads as: glyph · text · glyph (matching the search icon on the left), not a search input next to a chunky form control.
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      })}
    >
      <CommandsListIcon size={24} fill={token('colors.fgOverlay50')} />
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

export default SortButton
