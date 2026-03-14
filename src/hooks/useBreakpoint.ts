import { BreakpointToken, token } from '../../styled-system/tokens'
import viewportStore from '../stores/viewport'

/** Returns true when the viewport width is at or above the given Panda CSS breakpoint. */
const useBreakpoint = (breakpoint: BreakpointToken): boolean => {
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)
  return innerWidth >= parseInt(token(`breakpoints.${breakpoint}`))
}

export default useBreakpoint
