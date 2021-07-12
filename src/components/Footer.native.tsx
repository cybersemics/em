import React from 'react'
import { useDispatch } from 'react-redux'
import * as pkg from '../../package.json'
import { logout, showModal } from '../action-creators'
import { scaleFontDown, scaleFontUp } from '../action-creators/scaleSize'

import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from './Text.native'
import { useFooterUseSelectors } from '../hooks/Footer.useSelectors'

/** A footer component with some useful links. */
const Footer = () => {
  const dispatch = useDispatch()
  const { authenticated, user, status, pushQueueLength } = useFooterUseSelectors()

  // if (isTutorialOn && tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null

  return (
    <View style={styles.container}>
      <View style={styles.topContent}>
        <TouchableOpacity style={styles.topContentMargin} onPress={() => dispatch(scaleFontUp())}>
          <Text style={styles.scaleFontUp}>A</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => dispatch(scaleFontDown())}>
          <Text style={styles.lightblueText}>A</Text>
        </TouchableOpacity>

        <View style={styles.modalOptions}>
          <TouchableOpacity style={styles.optionButton} onPress={() => dispatch(showModal({ id: 'feedback' }))}>
            <Text style={styles.lightblueText}>Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={() => dispatch(showModal({ id: 'help' }))}>
            <Text style={styles.lightblueText}>Help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.authButton}
            onPress={() => (authenticated ? dispatch(logout()) : dispatch(showModal({ id: 'auth' })))}
          >
            <Text style={styles.lightblueText}>{authenticated ? 'Log Out' : 'Log In'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {user && (
        <>
          <View>
            <Text style={styles.textOpacityWhite}>Status: </Text>
            <Text style={styles.textOpacityWhite}>
              {pushQueueLength > 0
                ? 'Saving'
                : status === 'loaded'
                ? 'Online'
                : status[0].toUpperCase() + status.substring(1)}
            </Text>
          </View>
          <View>
            <Text style={styles.textOpacityWhite}>Logged in as: {user?.email} </Text>
          </View>
          <View>
            <Text style={styles.textOpacityWhite}>User ID: </Text>
            <Text style={styles.textOpacityWhite}>{user?.uid?.slice(0, 6)}</Text>
          </View>
        </>
      )}

      <View style={styles.flexEnd}>
        <Text style={styles.textOpacityWhite}>{`Version: ${pkg.version}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  topContentMargin: { marginRight: 20 },
  flexEnd: { alignItems: 'flex-end' },
  textOpacityWhite: { color: 'white', opacity: 0.5 },
  container: { backgroundColor: '#1a1a1a', padding: 15 },
  topContent: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 },
  scaleFontUp: { color: 'lightblue', fontSize: 14, textDecorationLine: 'underline' },
  lightblueText: { color: 'lightblue', textDecorationLine: 'underline' },
  optionButton: {
    paddingHorizontal: 10,
    marginHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  modalOptions: { flex: 1, justifyContent: 'flex-end', flexDirection: 'row' },
  authButton: {
    paddingLeft: 10,
    marginLeft: 5,
  },
})

export default Footer
