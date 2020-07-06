import { ActionCreator } from '../types'
import _ from 'lodash'

/**
 * Throttled action to limit the number actions dispatched within a fixed time.
 */
const throttledAction = _.throttle((dispatch, getState, value) => {
  const { showToolbar, showBreadcrumbs } = getState()
  if (showToolbar !== value && showBreadcrumbs !== value) {
    dispatch({
      type: 'toggleToolbarAndBreadCrumbs',
      value,
    })
  }
}, 100, { leading: false })

/**
 * Dispatches toggleToolbarAndBreadCrumbs action.
 *
 * @param value A boolean to represent the visibility state of toolbar & breadcrumbs.
 */
const toggleToolbarAndBreadCrumbs = (value: boolean): ActionCreator => (dispatch, getState) => {
  throttledAction(dispatch, getState, value)
}

export default toggleToolbarAndBreadCrumbs
