import React from 'react'
// import { HOME_PATH } from '../constants'
// import { simplifyPath, getSortPreference } from '../selectors'
// import { deleteAttribute, setCursor, toggleAttribute } from '../action-creators'
// import { pathToContext, unroot } from '../util'
import { Icon as IconType, Shortcut } from '../types'
// import getGlobalSortPreference from '../selectors/getGlobalSortPreference'
// import { useSelector } from 'react-redux'
// import { State } from '../util/initialState'
import Svg, { Polygon, Rect, G } from 'react-native-svg'
import { Alert } from 'react-native'

/* Available sort preferences */
// const sortPreferences = ['None', 'Alphabetical']

/** Get sort direction of cursor. */
/* const getCursorSortDirection = (state: State) => {
  const { cursor } = state
  const simplePath = simplifyPath(state, cursor || HOME_PATH)
  const context = pathToContext(simplePath)
  return getSortPreference(state, context).direction
} */

/** Ascending Icon Component. */
const IconAsc = ({ size = 20, fill }: IconType) => <Svg fill={fill} width={size} height={size} viewBox='0 0 24 24'>
  <G translateY={4}>
    <Polygon points='5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6' />
    <Rect x='10' y='16' width='11' height='2' />
    <Rect x='10' y='12' width='9' height='2' />
    <Rect x='10' y='8' width='7' height='2' />
    <Rect x='10' y='4' width='5' height='2' />
    <Rect x='10' y='0' width='3' height='2' />
  </G>
</Svg>

/** Descending Icon Component. */
// const IconDesc = ({ size = 20, fill }: IconType) => <Svg fill={fill} width={size} height={size} viewBox='0 0 24 24'>
//   <G translateY={4}>
//     <Polygon points='5,14.2 5,0 3,0 3,14.2 1.4,12.6 0,14 4,18 8,14 6.6,12.6' />
//     <Rect x='10' y='16' width='3' height='2' />
//     <Rect x='10' y='12' width='5' height='2' />
//     <Rect x='10' y='8' width='7' height='2' />
//     <Rect x='10' y='4' width='9' height='2' />
//     <Rect x='10' y='0' width='11' height='2' />
//   </G>
// </Svg>

// eslint-disable-next-line jsdoc/require-jsdoc
// const Icon = ({ size = 20, style }: IconType) => {
//   const direction = 'Desc' // useSelector(getCursorSortDirection)
//   const Component = direction === 'Desc' ? IconDesc : IconAsc
//   return <Component size={size} style={style} />
// }

/** Decide next sort preference.
 None → Alphabetical
 Alphabetical/Asc → Alphabetical/Desc
 Alphabetical/Desc → None.
 */
// const decideNextSortPreference = (currentSortPreference: SortPreference): SortPreference => {
//   if (currentSortPreference.direction === 'Asc') {
//     return {
//       type: currentSortPreference.type,
//       direction: 'Desc'
//     }
//   }
//   else {
//     const nextSortPreferenceType = sortPreferences[(sortPreferences.indexOf(currentSortPreference.type) + 1) % sortPreferences.length]
//     return {
//       type: nextSortPreferenceType,
//       direction: nextSortPreferenceType === 'None' ? null : 'Asc'
//     }
//   }
// }

const toggleSortShortcut: Shortcut = {
  id: 'toggleSort',
  label: 'Toggle Sort',
  description: 'Sort the current context alphabetically.',
  keyboard: { key: 's', meta: true, alt: true },
  svg: IconAsc,
  exec: () => Alert.alert('toggleSortShortcut')
  // exec: (dispatch, getState) => {
  //   const state = getState()
  //   const { cursor } = state

  //   const simplePath = simplifyPath(state, cursor || HOME_PATH)
  //   const context = pathToContext(simplePath)
  //   const currentSortPreference = getSortPreference(state, context)
  //   const globalSortPreference = getGlobalSortPreference(state)
  //   const nextSortPreference = decideNextSortPreference(currentSortPreference)

  //   // If next sort preference equals to global sort preference then delete sort attribute.
  //   if (globalSortPreference.type === nextSortPreference.type && globalSortPreference.direction === nextSortPreference.direction) {
  //     dispatch(deleteAttribute({
  //       context: context,
  //       key: '=sort',
  //     }))
  //   }
  //   // If next preference type is not equal to current preference type, toggle new sort type.
  //   // We need to have this control to not remove the sort type when switching between Alphabetical/Asc and Alphabetical/Desc
  //   else {

  //     // if next sort preference direction is null, toggle off sort direction
  //     !nextSortPreference.direction && currentSortPreference.direction &&
  //     dispatch(toggleAttribute({
  //       context: [...unroot(context), '=sort'],
  //       key: currentSortPreference.type,
  //       value: currentSortPreference.direction
  //     }));

  //     // If next sort preference type does not equal to current sort  then set =sort attribute.
  //     (nextSortPreference.type !== currentSortPreference.type || nextSortPreference.type === globalSortPreference.type) &&
  //     dispatch(toggleAttribute({
  //       context: context,
  //       key: '=sort',
  //       value: nextSortPreference.type
  //     }))

  //     // if next sort preference direction is not null, toggle direction
  //     nextSortPreference.direction &&
  //     dispatch(toggleAttribute({
  //       context: [...context, '=sort'],
  //       key: nextSortPreference.type,
  //       value: nextSortPreference.direction
  //     }))
  //   }

  //   if (cursor) {
  //     dispatch(setCursor({ path: state.cursor }))
  //   }
  // },
  // isActive: getState => {
  //   const state = getState()
  //   const { cursor } = state

  //   const context = pathToContext(cursor ? simplifyPath(state, cursor) : HOME_PATH)

  //   return getSortPreference(state, context).type === 'Alphabetical'
  // },
}

export default toggleSortShortcut
