import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Clear Thought icon. */
const ClearThoughtIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_25-clear-thought' data-name='25-clear-thought'>
            <rect width='24' height='24' fill='none' />
            <path
              d='M4.55,8.34H17.08a1,1,0,0,1,1,1v7.09a1,1,0,0,1-1,1H4.55a3,3,0,0,1-3-3V11.34a3,3,0,0,1,3-3Z'
              transform='translate(-5.75 8.39) rotate(-36.6)'
              stroke={strokeColor}
              fill='none'
            />
            <line x1='6.71' y1='20.27' x2='21.04' y2='20.27' stroke={strokeColor} fill='none' />
            <line x1='5.35' y1='10.55' x2='10.83' y2='17.8' stroke={strokeColor} fill='none' />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default ClearThoughtIcon
