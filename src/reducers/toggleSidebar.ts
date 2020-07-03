import { State } from '../util/initialState'

/** Toggles the sidebar. */
const toggleSidebar = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showSidebar: value == null ? !state.showSidebar : value,
})

export default toggleSidebar
