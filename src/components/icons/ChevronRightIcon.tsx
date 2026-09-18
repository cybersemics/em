import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

interface ChevronRightIconProps extends IconType {
  /** Stroke width in viewBox units, so it scales with size: 2 in the 24-unit box is 1px when rendered at 12px. */
  strokeWidth?: number
}

/** Chevron-right icon used to mark a link. */
const ChevronRightIcon: FC<ChevronRightIconProps> = ({ size = 24, fill, cssRaw, strokeWidth = 1 }) => {
  const strokeColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <path d='M9 6L15.5 12.5L9 19' stroke={strokeColor} strokeWidth={strokeWidth} />
    </svg>
  )
}

export default ChevronRightIcon
