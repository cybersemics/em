import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** MoveCursorForward icon. */
const MoveCursorForwardIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_15-move-thought-down' data-name='15-move-thought-down'>
            <rect className='cls-1' width='24' height='24' fill='none' />
            <line
              className='cls-2'
              x1='14.98'
              y1='18.56'
              x2='22.37'
              y2='18.56'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <line
              className='cls-2'
              x1='14.98'
              y1='11.43'
              x2='22.37'
              y2='11.43'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <circle className='cls-3' cx='10.52' cy='18.56' r='1' fill={strokeColor} />
            <circle className='cls-3' cx='10.52' cy='11.43' r='1' fill={strokeColor} />
            <line
              className='cls-2'
              x1='14.98'
              y1='4.3'
              x2='22.37'
              y2='4.3'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <circle className='cls-3' cx='10.52' cy='4.3' r='1' fill={strokeColor} />
            <line
              className='cls-2'
              x1='3.89'
              y1='12.43'
              x2='3.89'
              y2='20.13'
              stroke={strokeColor}
              strokeLinejoin='round'
            />
            <polyline
              className='cls-2'
              points='5.59 18.37 3.83 20.13 2.07 18.37'
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

export default MoveCursorForwardIcon
