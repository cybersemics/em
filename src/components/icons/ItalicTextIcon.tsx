import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Italic icon. */
const ItalicTextIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR // Ensure sizing follows scaling factor
  const strokeColor = style.fill || fill || token('colors.fg') // Calculate stroke color

  return (
    <svg
      className={cx(icon(), css(cssRaw))} // Combine class names
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24' // Keep the original viewBox
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }} // Inline styles
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_14-italic' data-name='14-italic'>
            <rect width='24' height='24' fill='none' />
            <path d='M9.63,2.88h9.24' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path d='M5.13,20.88h9.24' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path
              d='M14.25,2.88l-4.5,18'
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

export default ItalicTextIcon
