import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

interface ChevronIconProps extends IconType {
  /** Which way the chevron points. Defaults to 'up'. */
  direction?: 'up' | 'down'
}

/** A stroked chevron. Used by the Command Center drawer to expand (up) and collapse (down) its second stage. */
const ChevronIcon = ({ size = 24, fill, cssRaw, direction = 'up' }: ChevronIconProps) => {
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
        d={direction === 'up' ? 'M5 15L12 8L19 15' : 'M5 9L12 16L19 9'}
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export default ChevronIcon
