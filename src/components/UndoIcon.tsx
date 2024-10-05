import { cx } from '../../styled-system/css'
import { icon } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import Icon from '../@types/Icon'
import { ICON_SCALING_FACTOR } from '../constants'

/** An Undo icon. */
const UndoIcon = ({ fill, size = 18, style = {}, className }: Icon) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      version='1.1'
      className={cx(icon(), className)}
      xmlns='http://www.w3.org/2000/svg'
      x='0px'
      y='0px'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      fill={fill || token('colors.fg')}
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_01-undo' data-name='01-undo'>
            <rect width='24' height='24' fill='none' />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M4.24,7.24a10.24,10.24,0,0,1,2-2.11A8.67,8.67,0,1,1,4.69,17.29'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M7.94,7.71l-4.17.11L4,3.43'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default UndoIcon
