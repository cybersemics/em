import React from 'react'
import { SafeAreaView, Text, StyleSheet, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Toolbar from '../../../src/components/Toolbar'
import NavBar from '../../../src/components/NavBar'

/**
 * App container.
 */
const App: React.FC = () => {
  return (
    <>
      <StatusBar style='light' />
      <SafeAreaView style={styles.container}>
        <Toolbar />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.text}>hello World - em thoughts</Text>
        </ScrollView>
        <NavBar />
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    color: '#fff',
    fontSize: 20
  }
})

export { App }
