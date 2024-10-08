import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Underline icon refactored. */
const UnderlineIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
      <path d='M4.84,20.89H19.16' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
      <path
        d='M4.84,2.49v8.17a7.16,7.16,0,0,0,14.32,0V2.49'
        fill='none'
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export default UnderlineIcon
