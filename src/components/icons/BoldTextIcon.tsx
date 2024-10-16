import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Bold icon. */
const BoldTextIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR // Ensure sizing follows scaling factor
  const strokeColor = style.fill || fill || token('colors.fg') // Calculate stroke color

  return (
    <svg
      className={cx(icon(), css(cssRaw))} // Combine class names
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24' // Keep the original viewBox
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }} // Inline styles
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_13-bold' data-name='13-bold'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M6,4a.94.94,0,0,1,.94-.94h5.53a4.58,4.58,0,0,1,4.62,4A4.45,4.45,0,0,1,12.66,12H6Z'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
            />
            <path
              d='M6,12h7.84A4.29,4.29,0,0,1,18,16a4.3,4.3,0,0,1-4,4.89H6.83A.89.89,0,0,1,6,20V12Z'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default BoldTextIcon
