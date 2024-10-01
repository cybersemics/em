import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** JumpForward icon. */
const JumpForwardIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_08-jump-forward' data-name='08-jump-forward'>
            <rect className='cls-1' width='24' height='24' fill='none' />
            <path
              className='cls-2'
              d='M17,6.44,22,11.52a.72.72,0,0,1,0,1L17,17.6'
              stroke={strokeColor}
              strokeLinejoin='round'
              fill='none'
            />
            <path
              className='cls-2'
              d='M22.24,12H4.07a2.31,2.31,0,0,0-2.26,2.8h0a2.32,2.32,0,0,0,2.66,1.8l.78-.14A2.31,2.31,0,0,0,7,13.33L4.49,7.05'
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

export default JumpForwardIcon
