import * as Updates from 'expo-updates'
import React, { FC } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import ErrorBoundary from 'react-native-error-boundary'
import * as db from '../data-providers/dexie'
import { Text } from './Text.native'

/** A fallback component for a global error boundary that the main App component is wrapped in. */
const ErrorFallback = ({ error, componentStack }: { error?: Error; componentStack?: any }) => (
  <View style={styles.container}>
    <Text>Oops, there was an error.</Text>
    <View>
      {error && <Text>{error.message}</Text>}
      <Text>{componentStack}</Text>
      <TouchableOpacity onPress={() => Updates.reloadAsync()}>
        <Text>Refresh</Text>
      </TouchableOpacity>
    </View>
  </View>
)

/** Logs an error in the local database when it occurs. */
const onError = (error: Error, componentStack?: any) => db.log({ message: error.message, stack: componentStack })

/** A higher-order component that catches errors of all descendant components. When an error is caught, a fallback component will be rendered. */
const ErrorBoundaryContainer: FC = ({ children }) => (
  <ErrorBoundary FallbackComponent={ErrorFallback} onError={onError}>
    {children}
  </ErrorBoundary>
)

const styles = StyleSheet.create({
  container: { margin: 50 },
})

export default ErrorBoundaryContainer
