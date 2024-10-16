import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Extract Thought icon. */
const ExtractThoughtIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <rect width='24' height='24' fill='none' />
      <ellipse cx='11.97' cy='4.45' rx='8.8' ry='2.55' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <polyline
        points='3.5 5.13 10.14 15.46 10.14 22.1 13.86 19.51 13.86 15.39 20.62 4.92'
        stroke={strokeColor}
        strokeMiterlimit='10'
        fill='none'
      />
    </svg>
  )
}

export default ExtractThoughtIcon
