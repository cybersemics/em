import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** Bold icon. */
const BoldTextIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
      <title>Bold Icon</title>
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
