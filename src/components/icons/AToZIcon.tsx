import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** A-to-Z icon for alphabetical sort option in the Commands dialog. */
const AToZIcon: FC<IconType> = ({ size = 24, fill, cssRaw }) => {
  const color = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <g clipPath='url(#a-to-z-clip)'>
        <path d='M8.5 16.793L11.6465 13.6465L12.3535 14.3535L8 18.707L3.64648 14.3535L4.35352 13.6465L7.5 16.793V5H8.5V16.793Z' fill={color} />
        <path
          d='M16.59 5.02344H17.3122L19.8274 10.9006H18.8977L18.3083 9.44795H15.5108L14.9297 10.9006H14L16.59 5.02344ZM18.0178 8.75065L16.922 6.05278H16.9054L15.793 8.75065H18.0178Z'
          fill={color}
          stroke={color}
          strokeWidth='0.25'
        />
        <path
          d='M15 18.2373L18.0473 13.7627H15.0907V13H18.9546V13.7627L15.9225 18.2373H19V19H15V18.2373Z'
          fill={color}
          stroke={color}
          strokeWidth='0.25'
        />
      </g>
      <defs>
        <clipPath id='a-to-z-clip'>
          <rect width='24' height='24' fill={color} />
        </clipPath>
      </defs>
    </svg>
  )
}

export default AToZIcon
