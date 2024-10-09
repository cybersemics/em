import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** HomeToolbar icon. */
const HomeToolbarIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

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
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_11-home' data-name='11-home'>
            <rect className='cls-1' width='24' height='24' fill='none' />
            <polygon
              className='cls-2'
              points='20.88 21.25 20.88 8.89 12.22 2.06 3.56 8.89 3.56 21.25 20.88 21.25'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
            <path
              className='cls-3'
              d='M9.87,21.25V16.61a2.35,2.35,0,0,1,2.35-2.35h0a2.35,2.35,0,0,1,2.35,2.35v4.64'
              stroke={strokeColor}
              strokeMiterlimit='10'
              fill='none'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default HomeToolbarIcon
