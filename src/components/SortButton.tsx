import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import CommandSortType from '../@types/CommandSortType'
import useOnClickOutside from '../hooks/useOnClickOutside'
import theme from '../selectors/theme'
import FadeTransition from './FadeTransition'
import SortOption from './SortOption'
import SortIcon from './icons/SortIcon'

interface SortButtonProps {
  onSortChange: (sortOrder: CommandSortType) => void
}

/**
 * SortButton component.
 * */
const SortButton = ({ onSortChange }: SortButtonProps) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [selectedSort, setSelectedSort] = useState<CommandSortType>('type')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeDropdown = useCallback(() => setDropdownOpen(false), [])

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

  // Close the dropdown when the user taps outside of it, e.g. on the search field.
  useOnClickOutside(buttonRef, closeDropdown)

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
      ref={buttonRef}
      aria-label='sort commands'
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
      <FadeTransition in={isDropdownOpen} type='fast' unmountOnExit>
        <div
          aria-label='command sort options'
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
