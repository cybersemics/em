import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { FONT_SCALING_FACTOR } from '../../constants'

/** Heading1 icon. */
const Heading1Icon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const newSize = size * FONT_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={icon({ className })}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_18-heading1' data-name='18-heading1'>
            <rect width='24' height='24' fill='none' />
            <path d='M3.61,18.18V6.72H5.13v4.71h6V6.72H12.6V18.18H11.08v-5.4H5.13v5.4Z' fill={strokeColor} />
            <path
              d='M19.85,18.18H18.44v-9a7.78,7.78,0,0,1-1.33,1,9.39,9.39,0,0,1-1.48.72V9.55a8.51,8.51,0,0,0,2.06-1.34,5.46,5.46,0,0,0,1.25-1.53h.91Z'
              fill={strokeColor}
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default Heading1Icon
