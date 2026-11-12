import { BreakpointToken } from '../../styled-system/types'
import breakpoints from '../breakpoints.config'

/** Returns true when the viewport width is at or above the given Panda CSS breakpoint. Reads the viewport once, for code outside React; components use useBreakpoint, which re-renders when the viewport changes. */
const matchesBreakpoint = (breakpoint: BreakpointToken): boolean =>
  typeof window !== 'undefined' && window.matchMedia(`(min-width: ${breakpoints[breakpoint]})`).matches

export default matchesBreakpoint
