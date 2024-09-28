import { cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import Icon from '../../@types/Icon'

/** New thought icon. */
const NewThoughtIcon = ({ fill, size = 14, style = {}, className }: Icon) => {
  const scalingFactor = 1.37
  const newSize = size * scalingFactor
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), className)}
      xmlns='http://www.w3.org/2000/svg'
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      fill={fill || token('colors.fg')}
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px`, marginTop: '-1px' }}
    >
      <title>New Thought Icon</title>
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_03-new-thought' data-name='03-new-thought'>
            <rect width='24' height='24' fill='none' />
            <circle
              className='cls-2'
              cx='12'
              cy='12'
              r='10.15'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
            />
            <line
              className='cls-2'
              x1='12'
              y1='7.37'
              x2='12'
              y2='16.63'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
            />
            <line
              className='cls-2'
              x1='7.37'
              y1='12'
              x2='16.63'
              y2='12'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default NewThoughtIcon
