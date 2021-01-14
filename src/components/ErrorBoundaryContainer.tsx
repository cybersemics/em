import React, { FC } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import * as db from '../data-providers/dexie'

/** A fallback component for a global error boundary that the main App component is wrapped in. */
const ErrorFallback = ({ error, componentStack }: { error?: Error, componentStack?: any }) => <div style={{ margin: 50 }}>
  <p>Oops, there was an error.</p>
  <div style={{ fontSize: 14 }}>
    {error && <pre className='error'>{error.message}</pre>}
    <pre style={{ whiteSpace: 'normal' }}>{componentStack}</pre>
    <a onClick={() => window.location.reload()} className='button' style={{ minWidth: 0 }}>Refresh</a>
  </div>
</div>

/** Logs an error in the local database when it occurs. */
const onError = (error: Error, componentStack?: any) =>
  db.log({ message: error.message, stack: componentStack })

/** A higher-order component that catches errors of all descendant components. When an error is caught, a fallback component will be rendered. */
const ErrorBoundaryContainer: FC = ({ children }) =>
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={onError}
  >{children}</ErrorBoundary>

export default ErrorBoundaryContainer
