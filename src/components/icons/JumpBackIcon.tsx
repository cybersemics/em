import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** JumpBack icon. */
const JumpBackIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_07-jump-back' data-name='07-jump-back'>
            <rect className='cls-1' width='24' height='24' fill='none' />
            <path
              className='cls-2'
              d='M6.92,17.6,1.84,12.52a.7.7,0,0,1,0-1L6.92,6.44'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
            <path
              className='cls-2'
              d='M1.63,12H19.8a2.31,2.31,0,0,0,2.26-2.79h0a2.31,2.31,0,0,0-2.66-1.8l-.78.14a2.31,2.31,0,0,0-1.75,3.13L19.38,17'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default JumpBackIcon
