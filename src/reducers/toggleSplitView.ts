import _ from 'lodash'
import { State } from '../util/initialState'

/** Toggles the Split View. */
const toggleSplitView = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showSplitView: value == null ? !state.showSplitView : value
})

export default _.curryRight(toggleSplitView)
