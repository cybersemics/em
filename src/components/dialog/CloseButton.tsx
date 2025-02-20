import React from 'react'
import { css } from '../../../styled-system/css'
import { useSelector } from 'react-redux'
import themeColors from '../../selectors/themeColors'

interface CloseButtonProps {
  onClick: () => void
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClick }) => {
  const colors = useSelector(themeColors)

  return (
    <button
      onClick={onClick}
      className={css({
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '{colors.darkgray}',
        border: `2px solid #8d608c`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: colors.fg,
        transition: 'background-color 0.2s ease',
        backgroundImage: 'url("/assets/close.svg")',
        backgroundSize: '35%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        _hover: {
          backgroundColor: colors.bgOverlay50,
        },
      })}
    >
    </button>
  )
}

export default CloseButton
