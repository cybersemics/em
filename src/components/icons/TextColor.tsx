import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** Text Color Icon. */
const TextColorIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_17-text-color' data-name='17-text-color'>
            <rect width='24' height='24' fill='none' />
            <rect
              className='cls-2'
              x='2.73'
              y='2.73'
              width='18.53'
              height='18.53'
              rx='3'
              fill='none'
              stroke={strokeColor}
            />
            <line className='cls-2' x1='12' y1='7.2' x2='7.42' y2='16.6' fill='none' stroke={strokeColor} />
            <line className='cls-2' x1='12' y1='7.2' x2='16.58' y2='16.6' fill='none' stroke={strokeColor} />
            <line className='cls-2' x1='8.96' y1='13.44' x2='15.05' y2='13.44' fill='none' stroke={strokeColor} />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default TextColorIcon
