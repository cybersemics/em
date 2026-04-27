import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

interface CommandsSearchIconProps extends IconType {
  /** Stroke thickness of the magnifying-glass outline. */
  strokeWidth?: number
}

/** Search icon used by the Commands dialog search input (new style, 18×18 default). */
const CommandsSearchIcon: FC<CommandsSearchIconProps> = ({ size = 18, fill, cssRaw, strokeWidth = 1.5 }) => {
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
      <path
        d='M20 20L16.3833 16.3833M18.3333 11.6667C18.3333 15.3486 15.3486 18.3333 11.6667 18.3333C7.98477 18.3333 5 15.3486 5 11.6667C5 7.98477 7.98477 5 11.6667 5C15.3486 5 18.3333 7.98477 18.3333 11.6667Z'
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export default CommandsSearchIcon
