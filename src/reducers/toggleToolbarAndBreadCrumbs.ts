import { State } from '../util/initialState'

/** Toggles the Toolbar Visibility. */
const toggleToolbarAndBreadCrumbs = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showToolbar: value ?? !state.showToolbar,
  showBreadcrumbs: value ?? !state.showBreadcrumbs,
})

export default toggleToolbarAndBreadCrumbs
