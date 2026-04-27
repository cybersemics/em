import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Arrow-right icon used by the Commands dialog Forward button. */
const ArrowRightIcon: FC<IconType> = ({ size = 24, fill, cssRaw }) => {
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
      <path d='M12 19L19 12M19 12L12 5M19 12H5' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

export default ArrowRightIcon
