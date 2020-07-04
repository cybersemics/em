import { ActionCreator } from '../types'
import _ from 'lodash'

/**
 * Debounced action to limit the number actions dispatched within a fixed time.
 */
const debouncedAction = _.debounce((dispatch, getState, value) => {
  const { showToolbar, showBreadcrumbs } = getState()
  if (showToolbar !== value && showBreadcrumbs !== value) {
    dispatch({
      type: 'toggleToolbarAndBreadCrumbs',
      value,
    })
  }
}, 100)

/**
 * Dispatches toggleToolbarAndBreadCrumbs action.
 *
 * @param value A boolean to represent the visibility state of toolbar & breadcrumbs.
 */
const toggleToolbarAndBreadCrumbs = (value: boolean): ActionCreator => (dispatch, getState) => {
  debouncedAction(dispatch, getState, value)
}

export default toggleToolbarAndBreadCrumbs
