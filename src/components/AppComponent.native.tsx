import React from 'react'
import { SafeAreaView, Text, StyleSheet, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Toolbar from './Toolbar'
import NavBar from './NavBar'
import ModalFeedback from './ModalFeedback'

/**
 * AppComponent container.
 */
const AppComponent: React.FC = () => {
  return (
    <>
      <StatusBar
        // eslint-disable-next-line react/style-prop-object
        style='light'
      />
      <SafeAreaView style={styles.container}>
        <Toolbar />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.text}>hello World - em thoughts</Text>
        </ScrollView>
        <NavBar position='top' />
        <ModalFeedback />
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 20,
  },
})

export default AppComponent
