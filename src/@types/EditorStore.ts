import { Store as ReduxStore } from 'redux'
import Dispatch from './Dispatch'
import State from './State'
import Store from './Store'
import UiState from './UiState'

/** Captured editor reads and commands, with a UI-only Redux store for React Redux. */
interface EditorStore extends Store<State> {
  dispatch: Dispatch
  uiStore: Omit<ReduxStore<UiState>, 'dispatch'> & { dispatch: Dispatch }
}

export default EditorStore
