import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Generate Thought icon. */
const GenerateThoughtIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
      <path
        d='M2.37,20.87a2.12,2.12,0,0,0,3,0l13-13a2.12,2.12,0,1,0-3-3l-13,13A2.12,2.12,0,0,0,2.37,20.87Z'
        stroke={strokeColor}
        strokeLinejoin='round'
        fill='none'
      />
      <path d='M16.88,9.36l-3-3' stroke={strokeColor} strokeLinecap='round' fill='none' />
      <path
        d='M7.37,2.81l1.5-.44-.44,1.5.44,1.5-1.5-.44-1.5.44.44-1.5-.44-1.5Z'
        stroke={strokeColor}
        strokeMiterlimit='10'
        strokeWidth='0.75'
        fill='none'
        strokeLinecap='round'
      />
      <path
        d='M3.37,8.81l1.5-.44-.44,1.5.44,1.5-1.5-.44-1.5.44.44-1.5-.44-1.5Z'
        stroke={strokeColor}
        strokeMiterlimit='10'
        strokeWidth='0.75'
        fill='none'
        strokeLinecap='round'
      />
      <path
        d='M18.37,13.81l1.5-.44-.44,1.5.44,1.5-1.5-.44-1.5.44.44-1.5-.44-1.5Z'
        stroke={strokeColor}
        strokeMiterlimit='10'
        strokeWidth='0.75'
        fill='none'
        strokeLinecap='round'
      />
    </svg>
  )
}

export default GenerateThoughtIcon
