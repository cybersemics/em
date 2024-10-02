import { icon } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import IconType from '../@types/Icon'
import { FONT_SCALING_FACTOR } from '../constants'

/** Search icon. */
const SearchIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_12-search' data-name='12-search'>
            <rect className='cls-1' width='24' height='24' fill='none' />
            <path
              className='cls-2'
              d='M10.15,17.75A7.2,7.2,0,1,0,3,10.55,7.2,7.2,0,0,0,10.15,17.75Z'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
            <path
              className='cls-3'
              d='M21.12,21.52l-4.29-4.29'
              stroke={strokeColor}
              strokeLinejoin='round'
              strokeLinecap='round'
              fill='none'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default SearchIcon
