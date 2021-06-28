import React from 'react'
// import { connect } from 'react-redux'
// import { theme } from '../selectors'
// import { home, modalComplete } from '../action-creators'
import { Connected } from '../types'
// import { State } from '../util/initialState'
// import Modal from './Modal'
// import { MODALS, MODAL_CLOSE_DURATION } from '../constants'

import Svg, { Path } from 'react-native-svg'
import { TouchableOpacity, StyleSheet } from 'react-native'

interface HomeLinkProps {
  color?: string
  dark?: boolean
  showModal?: string | null
  size?: number
  style?: React.CSSProperties
}

// eslint-disable-next-line jsdoc/require-jsdoc
// const mapStateToProps = (state: State) => ({
//   dark: theme(state) !== 'Light',
//   showModal: state.showModal,
// })

/** A link to the home screen. */
const HomeLink = ({ dark = true, color, showModal, size = 60, style, dispatch }: Connected<HomeLinkProps>) => {
  return (
    <TouchableOpacity style={styles.container}>
      <Svg width={size || 35} height={size || 35} viewBox='0 0 35 35' fill={color || (dark ? '#FFF' : '#000')}>
        <Path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' />
        <Path d='M0 0h24v24H0z' fill='none' />
      </Svg>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 15 },
})

export default HomeLink
