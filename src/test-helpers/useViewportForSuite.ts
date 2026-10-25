import { act } from 'react'
import { afterEach, beforeEach } from 'vitest'
import viewportStore from '../stores/viewportStore'

/** Arranges and restores a consistent viewport for a rendered component suite, after createTestApp initializes it. */
const useViewportForSuite = ({ width, height = window.innerHeight }: { width: number; height?: number }) => {
  const originalWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')!
  const originalHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')!
  beforeEach(async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
    await act(async () => viewportStore.update({ innerWidth: width, innerHeight: height }))
  })
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', originalWidth)
    Object.defineProperty(window, 'innerHeight', originalHeight)
  })
}

export default useViewportForSuite
