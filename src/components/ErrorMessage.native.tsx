import React from 'react'
import { connect } from 'react-redux'
import { error } from '../action-creators'
import { Connected, State } from '../@types'
// import { useDispatch, useSelector } from 'react-redux'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { View } from 'moti'
import { commonStyles } from '../style/commonStyles'
import { fadeIn } from '../style/animations'

const { flexEnd, whiteText, centerText, redBackground } = commonStyles
const { from, animate } = fadeIn

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ error }: State) => ({ value: error })

/** An error message that can be dismissed with a close button. */
const ErrorMessage = ({ value, dispatch }: Connected<{ value?: any }>) =>
  value ? (
    <View style={[styles.container, redBackground]} from={from} animate={animate} transition={{ type: 'timing' }}>
      <TouchableOpacity style={flexEnd} onPress={() => dispatch(error({ value: null }))}>
        <Text style={whiteText}>x</Text>
      </TouchableOpacity>

      <Text style={[centerText, whiteText]}>{value?.toString()}</Text>
    </View>
  ) : null

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    width: '100%',
    opacity: 0.4,
    zIndex: 1000,
    padding: 10,
  },
})

export default connect(mapStateToProps)(ErrorMessage)
