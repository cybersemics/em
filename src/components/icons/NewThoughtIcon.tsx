import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** New thought icon. */
const NewThoughtIcon = ({ fill, size = 14, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      fill='none'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <rect width='24' height='24' fill='none' />
      <line x1='22.3' y1='12' x2='11.66' y2='12' stroke={strokeColor} strokeLinejoin='round' />
      <line x1='5.79' y1='9' x2='5.79' y2='15' stroke={strokeColor} strokeLinecap='round' />
      <line x1='2.79' y1='12' x2='8.79' y2='12' stroke={strokeColor} strokeLinecap='round' />
    </svg>
  )
}

export default NewThoughtIcon
