import React from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import theme from '../../selectors/theme'

interface CloseButtonProps {
  onClick: () => void
}

/**
 * Dialog close button.
 */
const CloseButton: React.FC<CloseButtonProps> = ({ onClick }) => {
  const isLightTheme = useSelector(state => theme(state) === 'Light')

  return (
    <button
      onClick={onClick}
      className={css({
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '{colors.darkgray}',
        border: `2px solid {colors.gray50}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '{colors.fg}',
        transition: 'background-color 0.2s ease-in-out',
        backgroundImage: isLightTheme ? 'url("/assets/close_light.svg")' : 'url("/assets/close.svg")',
        backgroundSize: '35%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        _hover: {
          backgroundColor: '{colors.gray15}',
        },
      })}
    ></button>
  )
}

export default CloseButton
