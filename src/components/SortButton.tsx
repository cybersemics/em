import { forwardRef, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import CommandSortType from '../@types/CommandSortType'
import theme from '../selectors/theme'
import SortOption from './SortOption'
import SortIcon from './icons/SortIcon'

export interface SortButtonHandle {
  closeDropdown: () => void
}

interface SortButtonProps {
  onSortChange: (sortOrder: CommandSortType) => void
}

/**
 * SortButton component.
 * */
const SortButton = forwardRef<SortButtonHandle, SortButtonProps>(({ onSortChange }, ref) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')
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
        width: '45px',
        border: 'solid 1px {colors.gray50}',
        backgroundColor: 'darkgray',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <SortIcon size={20} fill={isLightTheme ? '{colors.lightgray}' : '{colors.fg}'} />
      </div>
      <div
        className={cx(
          css({
            opacity: 0,
            transition: 'opacity {durations.fast} ease-in-out',
            position: 'absolute',
            top: '100%',
            marginTop: '0.5rem',
            right: 0,
            backgroundColor: 'bg',
            border: 'solid 1px {colors.gray50}',
            borderRadius: '8px',
            zIndex: 'dialog',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }),
          isDropdownOpen &&
            css({
              opacity: 1,
            }),
        )}
      >
        <h2
          className={css({
            color: 'gray50',
            borderBottom: 'none',
            textAlign: 'left',
            fontSize: '0.9rem',
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
    </button>
  )
})
SortButton.displayName = 'SortButton'

export default SortButton
