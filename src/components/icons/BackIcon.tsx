import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Back icon. */
const BackIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_06-back' data-name='06-back'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M8.17,18.16l-5.6-5.61a.77.77,0,0,1,0-1.1l5.6-5.6'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
            <line x1='2.34' y1='12.01' x2='21.08' y2='12.01' stroke={strokeColor} strokeLinejoin='round' fill='none' />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default BackIcon
