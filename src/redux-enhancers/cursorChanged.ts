import { Action, Store, StoreEnhancer, StoreEnhancerStoreCreator } from 'redux'
import { RANKED_ROOT } from '../constants'
import { chain, simplifyPath } from '../selectors'
import { Index, Path, SimplePath } from '../types'
import { clearSelection, equalPath, headValue, isDivider } from '../util'
import { State } from '../util/initialState'

interface SetCursorAction extends Action<any> {
    contextChain?: SimplePath[],
    cursorHistoryClear?: boolean,
    cursorHistoryPop?: boolean,
    editing?: boolean | null,
    noteFocus?: boolean,
    offset?: number | null,
    replaceContextViews?: Index<boolean>,
    path: Path | null,
}

/**
 * Store enhancer to append the ability to undo/redo for all undoable actions.
 */
const cursorChangedEnhancer: StoreEnhancer<any> = (createStore: StoreEnhancerStoreCreator) => <A extends Action<any>>(reducer: (state: any, action: A) => any, initialState: any): Store<State, A> => {

  /**
   * Clear cursor selection if on divider.
   */
  const cursorChangedReducer = (state: State | undefined = initialState, action: A & SetCursorAction): State => {
    if (!state) return reducer(initialState, action)

    const updatedState = reducer(state, action)
    if (!equalPath(state.cursor, updatedState.cursor)) {
      const { path, contextChain } = action
      const simplePath = path ? simplifyPath(state, path) : RANKED_ROOT
      const thoughtsResolved = path && contextChain && contextChain.length > 0
        ? chain(state, contextChain, simplePath!)
        : path || updatedState.cursor

      // clear browser selection if the cursor is on a divider
      if (thoughtsResolved && isDivider(headValue(thoughtsResolved))) {
        clearSelection()
      }
    }
    return updatedState

  }

  return createStore(cursorChangedReducer, initialState)
}

export default cursorChangedEnhancer
