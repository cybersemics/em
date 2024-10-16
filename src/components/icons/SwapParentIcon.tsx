import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** SwapParent icon. */
const SwapParentIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 27'
      fill='none'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <rect width='24' height='24' fill='none' />
      <path
        d='M13.05,20.26l-7.52-3.8a6.91,6.91,0,0,1,1-12.72'
        fill='none'
        stroke={strokeColor}
        strokeLinejoin='round'
      />
      <path d='M11.06,3.4l7.52,3.8a6.91,6.91,0,0,1-1,12.72' fill='none' stroke={strokeColor} strokeLinejoin='round' />
      <polyline points='12.03 6.38 11.06 3.4 14.04 2.43' fill='none' stroke={strokeColor} strokeLinejoin='round' />
      <polyline points='10.04 21.29 13.02 20.32 12.05 17.34' fill='none' stroke={strokeColor} strokeLinejoin='round' />
      <circle cx='12.05' cy='11.83' r='2' fill={strokeColor} opacity='0.3' />
      <circle cx='12.05' cy='11.83' r='1.16' fill={strokeColor} />
    </svg>
  )
}

export default SwapParentIcon
