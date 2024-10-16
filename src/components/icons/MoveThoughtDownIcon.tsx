import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Move Thought Down icon. */
const MoveThoughtDownIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_15-move-thought-down' data-name='15-move-thought-down'>
            <rect fill='none' width='24' height='24' />
            <line stroke={strokeColor} strokeLinejoin='round' fill='none' x1='14.98' y1='18.56' x2='22.37' y2='18.56' />
            <line stroke={strokeColor} strokeLinejoin='round' fill='none' x1='14.98' y1='11.43' x2='22.37' y2='11.43' />
            <circle fill={strokeColor} cx='10.52' cy='18.56' r='1' />
            <circle fill={strokeColor} cx='10.52' cy='11.43' r='1' />
            <line stroke={strokeColor} strokeLinejoin='round' fill='none' x1='14.98' y1='4.3' x2='22.37' y2='4.3' />
            <circle fill={strokeColor} cx='10.52' cy='4.3' r='1' />
            <line stroke={strokeColor} strokeLinejoin='round' fill='none' x1='3.89' y1='12.43' x2='3.89' y2='20.13' />
            <polyline
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
              points='5.59 18.37 3.83 20.13 2.07 18.37'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default MoveThoughtDownIcon
