import { useSelector } from 'react-redux'
import { cx } from '../../../styled-system/css'
import { icon } from '../../../styled-system/recipes'
import { token } from '../../../styled-system/tokens'
import Icon from '../../@types/Icon'
import State from '../../@types/State'
import { HOME_PATH } from '../../constants'
import { FONT_SCALING_FACTOR } from '../../constants'
import getSortPreference from '../../selectors/getSortPreference'
import head from '../../util/head'

/** Get sort direction of cursor. */
const getCursorSortDirection = (state: State) => getSortPreference(state, head(state.cursor || HOME_PATH)).direction

/** Ascending Icon Component. */
const IconAsc = ({ fill, size = 20, style = {}, className }: Icon) => {
  const newSize = size * FONT_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      className={cx(icon(), className)}
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      fill='none'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_10-sort' data-name='10-sort'>
            <rect width='24' height='24' fill='none' />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='5.51'
              y1='4.33'
              x2='5.51'
              y2='19.67'
            />
            <polyline
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              points='2.27 16.42 5.51 19.66 8.81 16.36'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='4.73'
              x2='15.2'
              y2='4.73'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='9.71'
              x2='17.78'
              y2='9.71'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='14.69'
              x2='19.48'
              y2='14.69'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='19.67'
              x2='21.73'
              y2='19.67'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

/** Descending Icon Component. */
const IconDesc = ({ fill, size = 20, style = {}, className }: Icon) => {
  const newSize = size * FONT_SCALING_FACTOR
  const strokeColor = style.fill || fill || token('colors.fg')

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      className={cx(icon(), className)}
      width={newSize}
      height={newSize}
      viewBox='0 0 24 24'
      fill='none'
      style={{ ...style, width: `${newSize}px`, height: `${newSize}px` }}
    >
      <g id='Layer_2' data-name='Layer 2'>
        <g id='Layer_3' data-name='Layer 3'>
          <g id='_11-sort-descending' data-name='11-sort-descending'>
            <rect width='24' height='24' fill='none' />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='5.51'
              y1='19.67'
              x2='5.51'
              y2='4.33'
            />
            <polyline
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              points='2.27 7.57 5.51 4.33 8.81 7.63'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='19.26'
              x2='15.2'
              y2='19.26'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='14.29'
              x2='17.78'
              y2='14.29'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='9.31'
              x2='19.48'
              y2='9.31'
            />
            <line
              stroke={strokeColor}
              strokeLinecap='round'
              strokeLinejoin='round'
              x1='12.08'
              y1='4.33'
              x2='21.73'
              y2='4.33'
            />
          </g>
        </g>
      </g>
    </svg>
  )
}

/** Main Icon Component. */
const SortIcon = ({ size = 20, style, className }: Icon) => {
  const direction = useSelector(getCursorSortDirection)
  const Component = direction === 'Desc' ? IconDesc : IconAsc
  return <Component size={size} style={style} className={className} />
}

export default SortIcon
