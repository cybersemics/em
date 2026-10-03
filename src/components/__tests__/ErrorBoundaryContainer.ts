import { render } from '@testing-library/react'
import { createElement } from 'react'
import { vi } from 'vitest'
import debugLog from '../../util/debugLog'
import ErrorBoundaryContainer from '../ErrorBoundaryContainer'

/** A component that throws while rendering. */
const Throw = () => {
  throw new Error('render failed')
}

afterEach(() => {
  vi.restoreAllMocks()
})

it('records a render error in the debug log with its component stack', () => {
  debugLog.setEnabled(true)
  debugLog.clear()
  // React reports a caught render error to the console as well; silence it so the expected error does not read as a failure.
  vi.spyOn(console, 'error').mockImplementation(() => {})

  render(createElement(ErrorBoundaryContainer, null, createElement(Throw)))

  const [entry] = debugLog.read().filter(entry => entry.type === 'error')
  expect(entry).toMatchObject({ source: 'render', name: 'Error', message: 'render failed' })
  expect(entry.componentStack).toContain('Throw')
})
