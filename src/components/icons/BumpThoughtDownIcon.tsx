import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Bump Thought Down icon. */
const BumpThoughtDownIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_14-bump-thought-down' data-name='14-bump-thought-down'>
            <rect fill='none' width='24' height='24' />
            <circle stroke={strokeColor} strokeLinejoin='round' fill='none' cx='20.07' cy='18.08' r='2.49' />
            <line stroke={strokeColor} strokeLinejoin='round' fill='none' x1='19.31' y1='15.13' x2='19.21' y2='14.64' />
            <path
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
              d='M18.94,13.2l-.52-2.73a1.73,1.73,0,0,0-3.35-.21l-2,6.19'
              strokeDasharray='0.97 1.46'
            />
            <polyline
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
              points='12.85 17.14 12.7 17.62 12.62 17.12'
            />
            <path
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
              d='M12.39,15.71,11,6.81a1.57,1.57,0,0,0-3.1,0l-1.5,9.59'
              strokeDasharray='0.96 1.43'
            />
            <polyline
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
              points='6.27 17.12 6.19 17.62 6.13 17.12'
            />
            <path
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
              d='M5.94,15.62l-1-8.44A5.39,5.39,0,0,0,1.42,2.79'
              strokeDasharray='1.01 1.51'
            />
            <path stroke={strokeColor} strokeLinejoin='round' fill='none' d='M.69,2.58.2,2.5' />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default BumpThoughtDownIcon
