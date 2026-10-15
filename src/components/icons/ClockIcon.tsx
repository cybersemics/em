import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

interface ClockIconProps extends IconType {
  /** Stroke thickness of the clock outline and hands. */
  strokeWidth?: number
}

/** Clock icon used by the Commands dialog sort button when "Recently used" is active. */
const ClockIcon: FC<ClockIconProps> = ({ size = 18, fill, cssRaw, strokeWidth = 1.5 }) => {
  const strokeColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 30 30'
      fill='none'
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <path
        d='M15 9V15L19 17M25 15C25 20.5228 20.5228 25 15 25C9.47715 25 5 20.5228 5 15C5 9.47715 9.47715 5 15 5C20.5228 5 25 9.47715 25 15Z'
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export default ClockIcon
