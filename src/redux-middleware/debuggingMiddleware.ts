import { Dispatch, Middleware } from 'redux'
import State from '../@types/State'
import isTutorial from '../selectors/isTutorial'

/** Redux Middleware for debugging. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debuggingMiddleware: Middleware<any, State, Dispatch> =
  ({ getState }) =>
  next =>
  action => {
    next(action)

    const state = getState()
    const { isLoading, showModal, thoughts } = state

    // Try to catch the __EM__ with empty childrenMap bug
    // https://github.com/cybersemics/em/issues/2223
    if (
      // childrenMap is expected to be empty on the loading screen, welcome screen, and beginning of tutorial
      !isLoading &&
      showModal !== 'welcome' &&
      !isTutorial(state) &&
      // after that, it should never be empty
      Object.keys(thoughts.thoughtIndex.__EM__.childrenMap).length === 0
    ) {
      console.error(action)
      throw new Error(
        '__EM__ with empty childrenMap detected. This should never happen after the welcome screen is closed.',
      )
    }
  }

export default debuggingMiddleware
