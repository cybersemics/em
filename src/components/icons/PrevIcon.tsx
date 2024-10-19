import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Prev icon. */
const PrevIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_10-previous-thought' data-name='10-previous-thought'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M12.2,22.31V16.75H9.62A3.8,3.8,0,0,1,5.82,13h0a3.8,3.8,0,0,1,3.8-3.8H12.2V1.55'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
            <path d='M9.2,4.55l3-3,3,3' stroke={strokeColor} strokeLinejoin='round' fill='none' />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default PrevIcon
