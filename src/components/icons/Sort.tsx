import React from 'react'
import { useSelector } from 'react-redux'
import { HOME_PATH } from '../../constants'
import { Icon as IconType, State } from '../../@types'
import { simplifyPath, getSortPreference } from '../../selectors'
import { pathToContext } from '../../util'

/** Get sort direction of cursor. */
const getCursorSortDirection = (state: State) => {
  const { cursor } = state
  const simplePath = simplifyPath(state, cursor || HOME_PATH)
  const context = pathToContext(state, simplePath)
  return getSortPreference(state, context).direction
}

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
      <polygon points='5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6' />
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
