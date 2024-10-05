import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** HiddenThoughts icon. */
const HiddenThoughtsIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_24-show-hidden-thoughts' data-name='24-show-hidden-thoughts'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M21.73,10.89a2,2,0,0,1,0,2.21A11.72,11.72,0,0,1,12,18.5a11.72,11.72,0,0,1-9.73-5.4,2,2,0,0,1,0-2.21A11.71,11.71,0,0,1,12,5.5,11.71,11.71,0,0,1,21.73,10.89Z'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <circle
              cx='12'
              cy='11.99'
              r='3.87'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='19.29'
              y1='4.71'
              x2='4.69'
              y2='19.3'
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

export default HiddenThoughtsIcon
