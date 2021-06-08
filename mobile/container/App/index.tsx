import React from 'react'
import { SafeAreaView, View, Text, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'

/**
 * App container.
 */
const App: React.FC = () => {
  return (
    <>
      <StatusBar style='light' />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.text}>hello World - em thoughts</Text>
        </View>
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
