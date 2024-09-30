import { cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/** Pin icon. */
const PinIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
  const scalingFactor = 1.37 // Adjust as needed
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
      fill={fill || token('colors.fg')}
    >
      <title>Pin Icon</title>
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_07-pin' data-name='07-pin'>
            <rect width='24' height='24' fill='none' />
            <ellipse
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              cx='17.66'
              cy='6.04'
              rx='2.33'
              ry='4.94'
              transform='translate(0.9 14.26) rotate(-45)'
            />
            <path
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              d='M14,14a6.58,6.58,0,0,1-1.65,6.57h0A21.55,21.55,0,0,1,3,11.21H3A6.59,6.59,0,0,1,9.66,9.6'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='13.82'
              y1='5.45'
              x2='9.65'
              y2='9.62'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='18.16'
              y1='9.78'
              x2='13.99'
              y2='13.95'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='6.92'
              y1='16.6'
              x2='2.47'
              y2='21.05'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default PinIcon
