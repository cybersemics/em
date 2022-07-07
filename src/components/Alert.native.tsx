import { View } from 'moti'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import Alert from '../@types/Alert'
import State from '../@types/State'
import alertAction from '../action-creators/alert'
import { fadeIn } from '../style/animations'
import { commonStyles } from '../style/commonStyles'

const { from, animate } = fadeIn
const { flexEnd, whiteText, centerText } = commonStyles

/** An alert component with an optional closeLink that fades in and out. */
const AlertComponent = () => {
  const alert = useSelector((state: State) => state.alert) as NonNullable<Alert>
  const dispatch = useDispatch()

  // eslint-disable-next-line jsdoc/require-jsdoc
  const close = () => {
    dispatch(alertAction(null))
  }

  return (
    <View
      style={[styles.container]}
      from={from}
      animate={animate}
      transition={{
        type: 'timing',
        duration: 350,
      }}
    >
      {alert?.showCloseLink ? (
        <TouchableOpacity style={flexEnd} onPress={close}>
          <Text style={whiteText}>x</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={[centerText, whiteText]}>{alert?.value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    position: 'absolute',
    top: 0,
    width: '100%',
    opacity: 0.9,
    zIndex: 1000,
    paddingVertical: 5,
  },
})

export default AlertComponent
