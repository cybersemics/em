import { store } from '../store'
import { ActionCreator } from '../types'

/**
 * Dispatches an alert action.
 *
 * @param value A boolean to represent the visibility state of toolbar & breadcrumbs.
 */
const toggleToolbarAndBreadCrumbs = (value: boolean): ActionCreator => dispatch => {
  const { showToolbar, showBreadcrumbs } = store.getState()
  if (showToolbar !== value && showBreadcrumbs !== value) {
    dispatch({
      type: 'toggleToolbarAndBreadCrumbs',
      value,
    })
  }
}

export default toggleToolbarAndBreadCrumbs
