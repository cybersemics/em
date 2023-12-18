import { useSelector } from 'react-redux'
import IconType from '../../@types/Icon'
import State from '../../@types/State'
import { HOME_PATH } from '../../constants'
import getSortPreference from '../../selectors/getSortPreference'
import head from '../../util/head'

/** Get sort direction of cursor. */
const getCursorSortDirection = (state: State) => getSortPreference(state, head(state.cursor || HOME_PATH)).direction

/** Ascending Icon Component. */
const IconAsc = ({ size = 20, style }: IconType) => (
  <svg
    version='1.1'
    className='icon'
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    style={style}
    viewBox='0 0 24 24'
    enableBackground='new 0 0 24 24'
  >
    <g style={{ transform: 'translateY(4px)' }}>
      <polygon points='5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6' />
      <rect x='10' y='16' width='11' height='2' />
      <rect x='10' y='12' width='9' height='2' />
      <rect x='10' y='8' width='7' height='2' />
      <rect x='10' y='4' width='5' height='2' />
      <rect x='10' y='0' width='3' height='2' />
    </g>
  </svg>
)

/** Descending Icon Component. */
const IconDesc = ({ size = 20, style }: IconType) => (
  <svg
    version='1.1'
    className='icon'
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    style={style}
    viewBox='0 0 24 24'
    enableBackground='new 0 0 24 24'
  >
    <g style={{ transform: 'translateY(4px)' }}>
      <polygon points='5 3.8 5 18 3 18 3 3.8 1.4 5.4 0 4 4 0 8 4 6.6 5.4' />
      <rect x='10' y='16' width='3' height='2' />
      <rect x='10' y='12' width='5' height='2' />
      <rect x='10' y='8' width='7' height='2' />
      <rect x='10' y='4' width='9' height='2' />
      <rect x='10' y='0' width='11' height='2' />
    </g>
  </svg>
)

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ size = 20, style }: IconType) => {
  const direction = useSelector(getCursorSortDirection)
  const Component = direction === 'Desc' ? IconDesc : IconAsc
  return <Component size={size} style={style} />
}

export default Icon
