import { css, cx } from '../../styled-system/css'
import { icon } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import Icon from '../@types/Icon'
import { ICON_SCALING_FACTOR } from '../constants'

/** A redo icon. */
const RedoIcon = ({ fill, size = 18, style = {}, cssRaw }: Icon) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill={fill || token('colors.fg')}
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_02-redo' data-name='02-redo'>
            <rect width='24' height='24' fill='none' />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M19.76,7.24a10.24,10.24,0,0,0-2-2.11,8.67,8.67,0,1,0,1.57,12.16'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M16.06,7.71l4.17.11L20,3.43'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default RedoIcon
