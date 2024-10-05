import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Pencil icon. */
const PencilIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_19-note' data-name='19-note'>
            <rect width='24' height='24' fill='none' />
            <path d='M3,21.49H21' fill='none' stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' />
            <path
              d='M18.18,2.8l2.06,2.07a1,1,0,0,1,0,1.41L8.73,17.79,4,19l1.21-4.69L16.76,2.8A1,1,0,0,1,18.18,2.8Z'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='13.94'
              y1='5.63'
              x2='17.42'
              y2='9.11'
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

export default PencilIcon
