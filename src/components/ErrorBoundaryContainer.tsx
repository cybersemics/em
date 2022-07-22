import React, { FC, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import * as db from '../data-providers/dexie'

/** A triangular toggle component. */
const Toggle = ({ children, expand, title }: { children?: any; expand?: boolean; title?: string }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer', marginBottom: 20, userSelect: 'none' }}>
        <svg
          viewBox='0 0 600 600'
          style={{
            height: 18,
            width: 18,
            position: 'relative',
            top: 4,
            marginRight: 3,
          }}
        >
          <g>
            <path
              className='glyph-fg triangle'
              d='M260.8529375873694,149.42646091838702 L260.8529375873694,450.5735238982077 L409.1470616167427,297.55825763741126 L260.8529375873694,149.42646091838702 z'
              fill='#fff'
              style={{
                transform: expanded ? 'rotate(90deg) translateX(10px)' : '',
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out',
              }}
            />
          </g>
        </svg>
        <span>{title || ''}</span>
      </div>
      {expanded && <div>{children}</div>}
    </div>
  )
}

/** A fallback component for a global error boundary that the main App component is wrapped in. */
const ErrorFallback = ({ error, componentStack }: { error?: Error; componentStack?: any }) => (
  <div style={{ margin: 50 }}>
    <p>Oops, there was an error.</p>
    <div style={{ fontSize: 14 }}>
      {error && <pre className='invalid-option'>{error.message || 'Error'}</pre>}
      {error && (
        <div>
          <Toggle title='Details:'>
            <pre style={{ color: 'gray' }}>{error.stack}</pre>
          </Toggle>
        </div>
      )}
      <pre style={{ whiteSpace: 'normal' }}>{componentStack}</pre>
      <a onClick={() => window.location.reload()} className='button' style={{ minWidth: 0 }}>
        Refresh
      </a>
    </div>
  </div>
)

/** Logs an error in the local database when it occurs. */
const onError = (error: Error, componentStack?: any) => db.log({ message: error.message, stack: componentStack })

/** A higher-order component that catches errors of all descendant components. When an error is caught, a fallback component will be rendered. */
const ErrorBoundaryContainer: FC = ({ children }) => (
  <ErrorBoundary FallbackComponent={ErrorFallback} onError={onError}>
    {children}
  </ErrorBoundary>
)

export default ErrorBoundaryContainer
