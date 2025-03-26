import { FC } from 'react'
import { css, cx } from '../../../styled-system/css'
import { iconRecipe } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/IconType'

/** Sort icon, used in the search input. */
const SortIcon: FC<IconType> = ({ size = 48, fill, cssRaw }) => {
  const fillColor = fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 800 800'
      width={size}
      height={size}
      fill={fillColor}
      className={cx(iconRecipe(), css(cssRaw))}
    >
      <path
        xmlns='http://www.w3.org/2000/svg'
        id='Path'
        fill='none'
        stroke={token('colors.fg')}
        strokeWidth='50'
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M 733.333313 233.333313 L 66.666664 233.333313'
      />
      <path
        xmlns='http://www.w3.org/2000/svg'
        id='path1'
        fill='none'
        stroke={token('colors.fg')}
        strokeWidth='50'
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M 633.333313 400 L 166.666672 400'
      />
      <path
        xmlns='http://www.w3.org/2000/svg'
        id='path2'
        fill='none'
        stroke={token('colors.fg')}
        strokeWidth='50'
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M 533.333313 566.666687 L 266.666656 566.666687'
      />
    </svg>
  )
}

export default SortIcon
