import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** Outdent icon. */
const OutdentIcon = ({ fill, size = 14, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      className={cx(icon(), css(cssRaw))}
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_05-outdent' data-name='05-outdent'>
            <rect width='24' height='24' fill='none' />
            <line
              x1='20.8'
              y1='1.89'
              x2='3.2'
              y2='1.89'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='20.8'
              y1='8.55'
              x2='14.68'
              y2='8.55'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='10.01'
              y1='11.88'
              x2='3.2'
              y2='11.88'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='20.8'
              y1='15.21'
              x2='14.68'
              y2='15.21'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <line
              x1='20.8'
              y1='21.87'
              x2='3.2'
              y2='21.87'
              fill='none'
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <polyline
              points='6.25 8.83 3.2 11.88 6.3 14.99'
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

export default OutdentIcon
