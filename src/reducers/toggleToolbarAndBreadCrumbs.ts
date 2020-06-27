import { State } from '../util/initialState'

/** Toggles the Toolbar Visibility. */
const toggleToolbarAndBreadCrumbs = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showToolbar: value === null ? !state.showToolbar : value,
  showBreadcrumbs: value ?? !state.showToolbar,
})

export default toggleToolbarAndBreadCrumbs
