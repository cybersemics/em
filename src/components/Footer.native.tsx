import React, { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import * as pkg from '../../package.json'
import { logout, showModal, alert } from '../action-creators'
import { scaleFontDown, scaleFontUp } from '../action-creators/scaleSize'

import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from './Text.native'
import { useFooterUseSelectors } from '../hooks/Footer.useSelectors'
import { commonStyles } from '../style/commonStyles'

const { flexEnd, textOpacityWhite, hyperlink, lightblueText, row, justifyContentEnd, flexItemsEndRow } = commonStyles

/** A footer component with some useful links. */
const Footer = () => {
  const dispatch = useDispatch()
  const { authenticated, user, status, isPushing, isPushQueueEmpty, fontSize } = useFooterUseSelectors()

  // alert when font size changes
  const firstUpdate = useRef(true)

  // alert when font size changes
  useEffect(() => {
    // prevent alert dispatch when rendered for first time
    if (!firstUpdate.current) {
      dispatch(alert(`Font size: ${fontSize}`, { clearTimeout: 2000 }))
    } else {
      firstUpdate.current = false
    }
  }, [fontSize])

  // if (isTutorialOn && tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null
  return (
    <View style={styles.container}>
      <View style={[flexItemsEndRow]}>
        <TouchableOpacity style={styles.topContentMargin} onPress={() => dispatch(scaleFontUp())}>
          <Text style={[lightblueText, hyperlink, styles.scaleFontUp]}>A</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => dispatch(scaleFontDown())}>
          <Text style={[lightblueText, hyperlink]}>A</Text>
        </TouchableOpacity>

        <View style={[row, justifyContentEnd]}>
          <TouchableOpacity style={styles.optionButton} onPress={() => dispatch(showModal({ id: 'feedback' }))}>
            <Text style={[lightblueText, hyperlink]}>Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={() => dispatch(showModal({ id: 'help' }))}>
            <Text style={[lightblueText, hyperlink]}>Help</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.authButton}
            onPress={() => (authenticated ? dispatch(logout()) : dispatch(showModal({ id: 'auth' })))}
          >
            <Text style={[lightblueText, hyperlink]}>{authenticated ? 'Log Out' : 'Log In'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {user && (
        <>
          <View>
            <Text style={textOpacityWhite}>Status: </Text>
            <Text style={textOpacityWhite}>
              {(!isPushQueueEmpty || isPushing) && (status === 'loading' || status === 'loaded')
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
            <Text style={textOpacityWhite}>User ID: </Text>
            <Text style={textOpacityWhite}>{user?.uid?.slice(0, 6)}</Text>
          </View>
        </>
      )}

      <View style={flexEnd}>
        <Text style={textOpacityWhite}>{`Version: ${pkg.version}`}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  topContentMargin: { marginRight: 20 },
  flexEnd: { alignItems: 'flex-end' },
  textOpacityWhite: { color: 'white', opacity: 0.5 },
  container: { backgroundColor: '#1a1a1a', padding: 15 },
  topContent: { marginBottom: 15 },
  scaleFontUp: { fontSize: 14 },
  optionButton: {
    paddingHorizontal: 10,
    marginHorizontal: 5,
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  authButton: {
    paddingLeft: 10,
    marginLeft: 5,
  },
})

export default Footer
