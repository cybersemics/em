import React, { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'
import AppComponent from './AppComponent'
import syncStorage from '../util/nativeStorageHelper'
import ErrorBoundaryContainer from './ErrorBoundaryContainer'

/**
 * App container.
 */
const App: React.FC = () => {
  const [loading, setLoading] = useState(true)

  /** Init sync storage. */
  const init = async () => {
    await syncStorage.init()
    setLoading(false)
  }

  useEffect(() => {
    init()
  }, [init])

  if (loading) return null

  return (
    <Provider store={store}>
      <ErrorBoundaryContainer>
        <AppComponent />
      </ErrorBoundaryContainer>
    </Provider>
  )
}

export { App }
