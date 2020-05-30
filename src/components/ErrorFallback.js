import React from 'react'

/** A fallback component for a global error boundary that the main App component is wrapped in. */
const ErrorFallback = ({ error, componentStack }) => <div style={{ margin: 50 }}>
  <p>Oops, there was an error.</p>
  <div style={{ fontSize: 14 }}>
    <pre className='error'>{error.message}</pre>
    <pre>{componentStack}</pre>
  </div>
</div>

export default ErrorFallback
