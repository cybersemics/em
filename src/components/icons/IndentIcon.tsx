import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'

/**
 *
 */
const IndentIcon = ({ fill, size = 14, style = {}, className }: IconType) => {
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
    >
      <title>IndentIcon</title>
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_05-indent' data-name='05-indent'>
            <rect width='24' height='24' fill='none' />
            <line
              x1='3.2'
              y1='1.89'
              x2='20.8'
              y2='1.89'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='3.2'
              y1='8.55'
              x2='9.32'
              y2='8.55'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='13.99'
              y1='11.88'
              x2='20.8'
              y2='11.88'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='3.2'
              y1='15.21'
              x2='9.32'
              y2='15.21'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='3.2'
              y1='21.87'
              x2='20.8'
              y2='21.87'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <polyline
              points='17.75 8.83 20.8 11.88 17.7 14.99'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default IndentIcon
