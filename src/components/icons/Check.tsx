import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Check icon used for toggleDone. */
const CheckIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_12-mark-as-done' data-name='12-mark-as-done'>
            <rect width='24' height='24' fill='none' />
            <polyline
              stroke={strokeColor}
              fill='none'
              strokeLinecap='round'
              strokeLinejoin='round'
              points='2.28 13.51 7.67 18.91 21.72 4.86'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default CheckIcon
