import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import theme from '../selectors/theme'
import SortIcon from './icons/SortIcon'

/**
 * SortButton component.
 * */
const SortButton: React.FC<{ onSortChange: (sortOrder: 'alphabetical' | 'type') => void }> = ({ onSortChange }) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [selectedSort, setSelectedSort] = useState<'alphabetical' | 'type'>('type')

  /**
   * Handles the sort change.
   */
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
            visibility: 'hidden',
            transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
            willChange: 'opacity, visibility',
            position: 'absolute',
            top: '100%',
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
              visibility: 'visible',
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
        <label
          className={css({
            display: 'flex',
            flexDirection: 'row',
            color: 'gray50',
          })}
        >
          <input
            type='radio'
            checked={selectedSort === 'alphabetical'}
            onChange={() => handleSortChange('alphabetical')}
            className={css({
              appearance: 'none',
              width: '12px',
              height: '12px',
              border: '2px solid {colors.gray50}',
              borderRadius: '50%',
              display: 'inline-block',
              position: 'relative',
              '&:checked': {
                borderColor: 'fg',
              },
            })}
          />
          <h3
            className={css({
              color: selectedSort === 'alphabetical' ? '{colors.fg}' : '{colors.gray50}',
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
            type='radio'
            checked={selectedSort === 'type'}
            onChange={() => handleSortChange('type')}
            className={css({
              appearance: 'none',
              width: '12px',
              height: '12px',
              border: '2px solid {colors.gray50}',
              borderRadius: '50%',
              display: 'inline-block',
              position: 'relative',
              '&:checked': {
                borderColor: 'fg',
              },
            })}
          />
          <h3
            className={css({
              color: selectedSort === 'type' ? 'fg' : 'gray50',
              margin: '0 0 0 0.2rem',
              fontWeight: 'normal',
              fontSize: '0.9rem',
            })}
          >
            Type
          </h3>
        </label>
      </div>
    </button>
  )
}

export default SortButton
