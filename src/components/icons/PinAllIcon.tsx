import { cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** PinAll icon. */
const PinAllIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const scalingFactor = 1.37 // Adjusted to match the original aspect ratio
  const newSize = size * scalingFactor
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      className={cx(icon(), className)}
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <title>Pin All Icon</title>
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_08-pin-subthoughts' data-name='08-pin-subthoughts'>
            <rect width='24' height='24' fill='none' />
            <ellipse
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              cx='6.73'
              cy='7.26'
              rx='3.34'
              ry='1.58'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M8.74,12.82a4.45,4.45,0,0,1,2.35,3.93h0a14.58,14.58,0,0,1-8.91,0h0a4.46,4.46,0,0,1,2.42-4'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='4.61'
              y1='8.81'
              x2='4.61'
              y2='12.8'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='8.75'
              y1='8.81'
              x2='8.75'
              y2='12.8'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='6.64'
              y1='17.44'
              x2='6.64'
              y2='21.69'
            />
            <ellipse
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              cx='17.45'
              cy='3.69'
              rx='3.34'
              ry='1.58'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M19.47,9.25a4.44,4.44,0,0,1,2.35,3.92h0a14.58,14.58,0,0,1-8.91,0h0a4.45,4.45,0,0,1,2.42-4'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='15.34'
              y1='5.24'
              x2='15.34'
              y2='9.23'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='19.48'
              y1='5.24'
              x2='19.48'
              y2='9.23'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='17.36'
              y1='13.87'
              x2='17.36'
              y2='18.12'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default PinAllIcon
