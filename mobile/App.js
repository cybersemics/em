import React from 'react'
import WebView from 'react-native-webview'

const EM_APP_LOCAL_ADDRESS = 'http://192.168.1.2:3000'

/**
 * App Component.
 */
export default function App() {
  return <WebView source={{ uri: EM_APP_LOCAL_ADDRESS }} style={{ marginTop: 50 }} />

}
