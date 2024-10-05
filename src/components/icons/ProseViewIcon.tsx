import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Prose View icon. */
const ProseViewIcon = ({ fill, size = 20, style = {}, className }: IconType) => {
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
          <g id='_32-prose-view' data-name='32-prose-view'>
            <rect fill='none' width='24' height='24' />
            <rect
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              x='3.54'
              y='1.83'
              width='16.48'
              height='20.2'
              rx='2.11'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              x1='16.77'
              y1='5.53'
              x2='11.64'
              y2='5.53'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              x1='16.77'
              y1='8.92'
              x2='6.86'
              y2='8.92'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              x1='16.77'
              y1='12.3'
              x2='6.86'
              y2='12.3'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              x1='16.77'
              y1='15.69'
              x2='11.64'
              y2='15.69'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              x1='16.77'
              y1='19.08'
              x2='6.86'
              y2='19.08'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default ProseViewIcon
