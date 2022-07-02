import React from 'react'
import Svg, { G, Polygon, Rect } from 'react-native-svg'
import { useSelector } from 'react-redux'
import IconType from '../../@types/Icon'
import State from '../../@types/State'
import { HOME_PATH } from '../../constants'
import getSortPreference from '../../selectors/getSortPreference'
import simplifyPath from '../../selectors/simplifyPath'
import head from '../../util/head'

/** Get sort direction of cursor. */
const getCursorSortDirection = (state: State) => {
  const { cursor } = state
  const simplePath = simplifyPath(state, cursor || HOME_PATH)
  return getSortPreference(state, head(simplePath)).direction
}

/** Ascending Icon Component. */
const IconAsc = ({ size = 20, fill }: IconType) => (
  <Svg fill={fill} width={size} height={size} viewBox='0 0 24 24'>
    <G translateY={4}>
      <Polygon points='5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6' />
      <Rect x='10' y='16' width='11' height='2' />
      <Rect x='10' y='12' width='9' height='2' />
      <Rect x='10' y='8' width='7' height='2' />
      <Rect x='10' y='4' width='5' height='2' />
      <Rect x='10' y='0' width='3' height='2' />
    </G>
  </Svg>
)

/** Descending Icon Component. */
const IconDesc = ({ size = 20, fill }: IconType) => (
  <Svg fill={fill} width={size} height={size} viewBox='0 0 24 24'>
    <G translateY={4}>
      <Polygon points='5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6' />
      <Rect x='10' y='16' width='3' height='2' />
      <Rect x='10' y='12' width='5' height='2' />
      <Rect x='10' y='8' width='7' height='2' />
      <Rect x='10' y='4' width='9' height='2' />
      <Rect x='10' y='0' width='11' height='2' />
    </G>
  </Svg>
)

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ size = 20, fill }: IconType) => {
  const direction = useSelector(getCursorSortDirection)
  const Component = direction === 'Desc' ? IconDesc : IconAsc

  return <Component size={size} fill={fill} />
}

export default Icon
