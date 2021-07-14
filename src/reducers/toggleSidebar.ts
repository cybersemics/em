import _ from 'lodash'
import { State } from '../@types'

/** Toggles the sidebar. */
const toggleSidebar = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showSidebar: value == null ? !state.showSidebar : value,
})

export default _.curryRight(toggleSidebar)
