import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Normal Text icon. */
const NormalTextIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_23-normal-text' data-name='23-normal-text'>
            <rect width='24' height='24' fill='none' />
            <path d='M12,21.39V4' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path d='M10.11,21.39h3.78' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path
              d='M19.06,7.3V4.87a1,1,0,0,0-1-1H5.94a1,1,0,0,0-1,1V7.3'
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

export default NormalTextIcon
