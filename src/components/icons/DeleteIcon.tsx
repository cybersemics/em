import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** Delete icon. */
const DeleteIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const scalingFactor = 1.37
  const newSize = size * scalingFactor
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
          <g id='_22-trash' data-name='22-trash'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M4.66,6.11H19.34l-.9,14a2,2,0,0,1-2,1.91H7.59a2,2,0,0,1-2-1.91Z'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='2.95'
              y1='6.11'
              x2='21.05'
              y2='6.11'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M7.17,6.11V3.47a1.07,1.07,0,0,1,1.12-1h7.42a1.07,1.07,0,0,1,1.11,1V6.11'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='9.67'
              y1='11.01'
              x2='9.67'
              y2='17.14'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='14.14'
              y1='11.01'
              x2='14.14'
              y2='17.14'
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

export default DeleteIcon
