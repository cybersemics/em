import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Underline icon. */
const UnderlineIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
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
          <g id='_15-underline' data-name='15-underline'>
            <rect width='24' height='24' fill='none' />
            <path d='M4.84,20.89H19.16' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path
              d='M4.84,2.49v8.17a7.16,7.16,0,0,0,14.32,0V2.49'
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

export default UnderlineIcon
