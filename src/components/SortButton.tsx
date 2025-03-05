import React from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import theme from '../selectors/theme'

/**
 * SortButton component for the Command Library and Gesture Cheatsheet.
 */
const SortButton: React.FC = () => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')

  return (
    <button
      className={css({
        width: '45px',
        border: 'solid 1px {colors.gray50}',
        backgroundColor: '{colors.darkgray}',
        borderRadius: '8px',
        backgroundImage: isLightTheme ? 'url("/assets/sort_light.svg")' : 'url("/assets/sort.svg")',
        backgroundSize: '20px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      })}
    />
  )
}

export default SortButton
