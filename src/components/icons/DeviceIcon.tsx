import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Device icon. */
const DeviceIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_26-device-management' data-name='26-device-management'>
            <rect className='cls-1' width='24' height='24' fill='none' />
            <path
              d='M8.25,6.22v-2a2.44,2.44,0,0,1,2.44-2.44h8.45a2.44,2.44,0,0,1,2.44,2.44v12.3a2.44,2.44,0,0,1-2.44,2.44H12.39'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <rect
              x='2.81'
              y='6.22'
              width='9.58'
              height='16.12'
              rx='2'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='2.81'
              y1='18.38'
              x2='12.39'
              y2='18.38'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='2.81'
              y1='8.94'
              x2='12.39'
              y2='8.94'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='7.6'
              y1='20.39'
              x2='7.6'
              y2='20.39'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='14.91'
              y1='15.96'
              x2='14.91'
              y2='15.96'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='15.56'
              y1='4.36'
              x2='14.26'
              y2='4.36'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default DeviceIcon
