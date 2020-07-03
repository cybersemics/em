import { State } from '../util/initialState'

/** Toggles the sidebar. */
const toggleSidebar = (state: State, { value, activeViewID }: { value?: boolean, activeViewID?: String }) => {
  localStorage.setItem('showSplitView', String(value === null ? state.showSplitView : value))
  return {
    ...state,
    showSplitView: value == null ? state.showSplitView : value, activeView: activeViewID || 'main'
  }
}

export default toggleSidebar
