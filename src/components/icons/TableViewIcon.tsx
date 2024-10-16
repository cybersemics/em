import { css, cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import IconType from '../../@types/Icon'
import { ICON_SCALING_FACTOR } from '../../constants'

/** TableView icon. */
const TableViewIcon = ({ fill, size = 20, style = {}, cssRaw }: IconType) => {
  const newSize = size * ICON_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      className={cx(icon(), css(cssRaw))}
      viewBox='0 0 24 24'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
      fill='none'
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_09-table-view' data-name='09-table-view'>
            <rect width='24' height='24' fill='none' />
            <rect
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              fill='none'
              x='3'
              y='3'
              width='18'
              height='18'
              rx='3'
            />
            <line stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' x1='12' y1='3' x2='12' y2='21' />
            <line stroke={strokeColor} strokeLinecap='round' strokeLinejoin='round' x1='3' y1='12' x2='21' y2='12' />
          </g>
        </g>
      </g>
    </svg>
  )
}

export default TableViewIcon
