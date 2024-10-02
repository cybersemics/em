import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { FONT_SCALING_FACTOR } from '../../constants'

/** SubCategorizeAll icon. */
const subCategorizeAllIcon = ({ fill = 'black', size = 20, style = {}, className }: IconType) => {
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
          <g id='_21-categorize-all' data-name='21-categorize-all'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M7.19,5.84V18A2.62,2.62,0,0,0,9.82,20.6h4.8'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <circle
              cx='7.19'
              cy='3.64'
              r='1.95'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <circle
              cx='16.81'
              cy='20.6'
              r='1.95'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M7.19,6.28V9.8a2.63,2.63,0,0,0,2.63,2.63h4.8'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <circle
              cx='16.81'
              cy='12.43'
              r='1.95'
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

export default subCategorizeAllIcon
