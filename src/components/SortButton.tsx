import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import theme from '../selectors/theme'

/**
 * SortButton component for the Command Library and Gesture Cheatsheet.
 */
const SortButton: React.FC<{ onSortChange: (sortOrder: 'alphabetical' | 'type') => void }> = ({ onSortChange }) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [selectedSort, setSelectedSort] = useState<'alphabetical' | 'type' | null>(null)

  const handleSortChange = (sortOrder: 'alphabetical' | 'type') => {
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
          backgroundColor: '{colors.darkgray}',
          borderRadius: '8px',
          backgroundImage: isLightTheme ? 'url("/assets/sort_light.svg")' : 'url("/assets/sort.svg")',
          backgroundSize: '20px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
        })}
      >
      {isDropdownOpen && (
        <div
          className={css({
            position: 'absolute',
            top: '100%',
            right: 0,
            backgroundColor: '{colors.bg}',
            border: 'solid 1px {colors.gray50}',
            borderRadius: '8px',
            zIndex: 1000,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          })}
        >
          <h2
            className={css({
                color: '{colors.gray50}',
                borderBottom: 'none',
                textAlign: 'left',
                fontSize: '0.9rem',
                margin: '0',
            })}
          >
            Sort by:
            </h2>
          <label
            className={css({
              display: 'flex',
              flexDirection: 'row',
              color: '{colors.gray50}',
            })}
          >
            <input
              type="radio"
              checked={selectedSort === 'alphabetical'}
              onChange={() => handleSortChange('alphabetical')}
            />
            <h3
              className={css({
                color: '{colors.gray50}',             
                margin: '0 0 0 0.2rem',
                fontWeight: 'normal',
                fontSize: '0.9rem',
              })}
            >
              Alphabetical
            </h3>
          </label>
          <label
            className={css({
              display: 'flex',
              flexDirection: 'row',
            })}
          >
            <input
              type="radio"
              checked={selectedSort === 'type'}
              onChange={() => handleSortChange('type')}
            />
            <h3
                className={css({
                color: '{colors.gray50}',             
                margin: '0 0 0 0.2rem',
                fontWeight: 'normal',
                fontSize: '0.9rem',
                })}
            >
                Type
            </h3>
          </label>
        </div>
      )}
    </button>
  )
}

export default SortButton
