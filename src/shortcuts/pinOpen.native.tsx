import React from 'react'
// import { attributeEquals, simplifyPath } from '../selectors'
// import { pathToContext } from '../util'
// import { toggleAttribute } from '../action-creators'
import { Icon as IconType, Shortcut } from '../@types'
// import { HOME_PATH } from '../constants'
import Svg, { Path, G } from 'react-native-svg'
import { Alert } from 'react-native'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ size = 20, fill }: IconType) => (
  <Svg fill={fill} width={size} height={size} viewBox='0 0 20 20'>
    <G translate={[-516, -144]}>
      <G>
        <Path d='M525,154.95V166h1v-11.05c1.694-0.245,3-1.688,3-3.45c0-1.933-1.566-3.5-3.5-3.5s-3.5,1.567-3.5,3.5    C522,153.261,523.306,154.705,525,154.95z M523,151.5c0-1.381,1.119-2.5,2.5-2.5s2.5,1.119,2.5,2.5s-1.119,2.5-2.5,2.5    S523,152.881,523,151.5z' />
      </G>
    </G>
  </Svg>
)

const pinOpenShortcut: Shortcut = {
  id: 'pinOpen',
  label: 'Pin Open',
  description: 'Pin and expand the current thought.',
  // keyboard: { key: 'p', meta: true, alt: true },
  svg: Icon,
  exec: () => Alert.alert('pinOpenShortcut'),
  // exec: (dispatch, getState) => {
  //   const state = getState()
  //   const { cursor } = state
  //   if (!cursor) return

  //   const context = pathToContext(cursor)
  //   dispatch(toggleAttribute({
  //     context,
  //     key: '=pin',
  //     value: 'true',
  //   }))
  // },
  // isActive: getState => {
  //   const state = getState()
  //   const { cursor } = state
  //   const context = pathToContext(cursor ? simplifyPath(state, cursor) : HOME_PATH)
  //   return attributeEquals(state, context, '=pin', 'true')
  // }
}

export default pinOpenShortcut
