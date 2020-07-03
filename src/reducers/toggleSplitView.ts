import { State } from '../util/initialState'

/** Toggles the Split View. */
const toggleSplitView = (state: State, { value, activeViewID }: { value?: boolean, activeViewID?: string }) => {
  localStorage.setItem('showSplitView', String(value === null ? state.showSplitView : value))
  return {
    ...state,
    showSplitView: value == null ? state.showSplitView : value, activeView: activeViewID || 'main'
  }
}

export default toggleSplitView
