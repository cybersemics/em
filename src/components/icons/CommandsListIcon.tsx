import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

interface CommandsListIconProps extends IconType {
  /** Stroke thickness applied around the filled rectangles. 0 = pure fill (no outline). */
  strokeWidth?: number
}

/** List/group icon used by the Commands dialog group-by filter button (new style, 18×18 default). */
const CommandsListIcon: FC<CommandsListIconProps> = ({ size = 18, fill, cssRaw, strokeWidth = 0.5 }) => {
  const fillColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <path
        d='M7.33301 18.9395H5V17.9395H7.33301V18.9395ZM19 18.9395H9.66895V17.9395H19V18.9395ZM7.33301 12.4697H5V11.4697H7.33301V12.4697ZM19 12.4697H9.66895V11.4697H19V12.4697ZM7.33301 6H5V5H7.33301V6ZM19 6H9.66895V5H19V6Z'
        fill={fillColor}
        stroke={strokeWidth > 0 ? fillColor : 'none'}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
      />
    </svg>
  )
}

export default CommandsListIcon
