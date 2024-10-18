import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Next icon. */
const NextIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_09-next-thought' data-name='09-next-thought'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M12.13,1.55V7.11H14.7a3.8,3.8,0,0,1,3.8,3.79h0a3.8,3.8,0,0,1-3.8,3.8H12.13v7.61'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
            <path d='M15.13,19.31l-3,3-3-3' stroke={strokeColor} strokeLinejoin='round' fill='none' />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default NextIcon
