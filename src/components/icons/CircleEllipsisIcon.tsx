import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Circle ellipsis icon: three horizontal dots inside a rounded square background. */
const CircleEllipsisIcon: FC<IconType> = ({ size = 20, fill, cssRaw }) => {
  const fillColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 20 20'
      fill='none'
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <rect width='20' height='20' rx='10' fill={fillColor} fillOpacity='0.08' />
      <g opacity='0.5'>
        <path
          d='M10.0013 10.6654C10.3695 10.6654 10.668 10.3669 10.668 9.9987C10.668 9.63051 10.3695 9.33203 10.0013 9.33203C9.63311 9.33203 9.33464 9.63051 9.33464 9.9987C9.33464 10.3669 9.63311 10.6654 10.0013 10.6654Z'
          stroke={fillColor}
          strokeWidth='1.33333'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M14.668 10.6654C15.0362 10.6654 15.3346 10.3669 15.3346 9.9987C15.3346 9.63051 15.0362 9.33203 14.668 9.33203C14.2998 9.33203 14.0013 9.63051 14.0013 9.9987C14.0013 10.3669 14.2998 10.6654 14.668 10.6654Z'
          stroke={fillColor}
          strokeWidth='1.33333'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          d='M5.33464 10.6654C5.70283 10.6654 6.0013 10.3669 6.0013 9.9987C6.0013 9.63051 5.70283 9.33203 5.33464 9.33203C4.96645 9.33203 4.66797 9.63051 4.66797 9.9987C4.66797 10.3669 4.96645 10.6654 5.33464 10.6654Z'
          stroke={fillColor}
          strokeWidth='1.33333'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </g>
    </svg>
  )
}

export default CircleEllipsisIcon
