import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'

/** A fallback component for a global error boundary that the main App component is wrapped in. */
const ErrorFallback = ({ error, componentStack }) => <div style={{ margin: 50 }}>
  <p>Oops, there was an error.</p>
  <div style={{ fontSize: 14 }}>
    <pre className='error'>{error.message}</pre>
    <pre>{componentStack}</pre>
  </div>
</div>

/** A higher-order component that catches errors of all descendant components. When an error is caught, a fallback component will be rendered. */
const ErrorBoundaryContainer = ({ children }) =>
  <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>

export default ErrorBoundaryContainer
