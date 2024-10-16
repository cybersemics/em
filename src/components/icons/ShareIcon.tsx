import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Share icon. */
const ShareIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <rect width='24' height='24' fill='none' />
      <path
        d='M21,12.83v7.29a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2V12.83'
        fill='none'
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <line
        x1='11.88'
        y1='15.14'
        x2='11.88'
        y2='2.98'
        fill='none'
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <polyline
        points='15.79 5.89 11.87 1.97 8.22 5.62'
        fill='none'
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export default ShareIcon
