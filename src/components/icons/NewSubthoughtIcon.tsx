import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** New Subthought icon. */
const NewSubthoughtIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')
  const fillColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <rect width='24' height='24' fill='none' />
      <line x1='17.3' y1='7.91' x2='7.2' y2='7.91' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <circle cx='2.55' cy='7.91' r='1.25' fill={fillColor} />
      <line x1='22.77' y1='15.35' x2='14.66' y2='15.35' stroke={strokeColor} strokeLinejoin='round' fill='none' />
      <line x1='9.2' y1='13.35' x2='9.2' y2='17.35' stroke={strokeColor} strokeLinecap='round' fill='none' />
      <line x1='7.2' y1='15.35' x2='11.2' y2='15.35' stroke={strokeColor} strokeLinecap='round' fill='none' />
    </svg>
  )
}

export default NewSubthoughtIcon
