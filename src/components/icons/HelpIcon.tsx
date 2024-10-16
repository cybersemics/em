import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Help icon. */
const HelpIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
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
          <g id='_13-help' data-name='13-help'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M12.22,13.51v-.23a1.76,1.76,0,0,1,.94-1.49,1.69,1.69,0,0,0,.91-1.45,1.85,1.85,0,1,0-3.7,0'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
            />
            <path
              d='M12.21,16.18h0'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              strokeWidth='1.5'
            />
            <circle cx='12.22' cy='12' r='9.85' fill='none' stroke={strokeColor} strokeLinejoin='round' />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default HelpIcon
