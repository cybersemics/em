import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** TextColor Icon refactored. */
const TextColorIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
      <rect x='2.73' y='2.73' width='18.53' height='18.53' rx='3' fill='none' stroke={strokeColor} />
      <line x1='12' y1='7.2' x2='7.42' y2='16.6' fill='none' stroke={strokeColor} />
      <line x1='12' y1='7.2' x2='16.58' y2='16.6' fill='none' stroke={strokeColor} />
      <line x1='8.96' y1='13.44' x2='15.05' y2='13.44' fill='none' stroke={strokeColor} />
    </svg>
  )
}

export default TextColorIcon
