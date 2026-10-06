import { token } from '../../styled-system/tokens'
import { BreakpointToken } from '../../styled-system/types'
import viewportStore from '../stores/viewportStore'

/** Returns true when the viewport width is at or above the given Panda CSS breakpoint. */
const useBreakpoint = (breakpoint: BreakpointToken): boolean => {
  return viewportStore.useSelector(state => state.innerWidth >= parseInt(token(`breakpoints.${breakpoint}`)))
}

export default useBreakpoint
