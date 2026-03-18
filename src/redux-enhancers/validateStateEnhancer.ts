import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import isTutorial from '../selectors/isTutorial'
import equalPath from '../util/equalPath'

/**
 * Validates the next state after an action is applied and throws an error if fatal conditions are detected.
 * This prevents invalid state changes from occurring.
 */
const validateNextState = (nextState: State, action: Action): void => {
  const { isLoading, showModal, thoughts } = nextState

  // Try to catch the __EM__ with empty childrenMap bug
  // https://github.com/cybersemics/em/issues/2223
  if (
    // childrenMap is expected to be empty on the loading screen, welcome screen, and beginning of tutorial
    !isLoading &&
    showModal !== 'welcome' &&
    !isTutorial(nextState) &&
    // after that, it should never be empty
    Object.keys(thoughts.thoughtIndex.__EM__.childrenMap).length === 0
  ) {
    console.error(action)
    throw new Error(
      '__EM__ with empty childrenMap detected. This should never happen after the welcome screen is closed.',
    )
  } else if (equalPath(nextState.cursor, [HOME_TOKEN])) {
    console.error(action)
    throw new Error(`["${HOME_TOKEN}"] is not a valid cursor. The root node is represented by null.`)
  }
}

/** Store enhancer that validates state changes before they occur. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateStateEnhancer: StoreEnhancer<any> =
  (createStore: StoreEnhancerStoreCreator) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> =>
    createStore((state: State | undefined, action: A): State => {
      const nextState: State = reducer(state, action)

      // Validate the next state - this will throw if there are fatal errors
      validateNextState(nextState, action)

      return nextState
    }, initialState)

export default validateStateEnhancer
