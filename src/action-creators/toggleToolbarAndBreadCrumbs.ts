import { ActionCreator } from '../types'

/**
 * Dispatches toggleToolbarAndBreadCrumbs action.
 *
 * @param value A boolean to represent the visibility state of toolbar & breadcrumbs.
 */
const toggleToolbarAndBreadCrumbs = (value: boolean): ActionCreator => (dispatch, getState) => {
  const { showToolbar, showBreadcrumbs } = getState()
  if (showToolbar !== value && showBreadcrumbs !== value) {
    dispatch({
      type: 'toggleToolbarAndBreadCrumbs',
      value,
    })
  }
}

export default toggleToolbarAndBreadCrumbs
