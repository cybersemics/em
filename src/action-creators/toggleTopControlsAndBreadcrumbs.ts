import { Thunk } from '../types'
import _ from 'lodash'

/**
 * Throttled action to limit the number actions dispatched within a fixed time.
 */
const throttledAction = _.throttle((dispatch, getState, value) => {
  const { showTopControls, showBreadcrumbs } = getState()
  if (showTopControls !== value && showBreadcrumbs !== value) {
    dispatch({
      type: 'toggleTopControlsAndBreadcrumbs',
      value,
    })
  }
}, 100, { leading: false })

/**
 * Dispatches toggleTopControlsAndBreadcrumbs action.
 *
 * @param value A boolean to represent the visibility state of toolbar & breadcrumbs.
 */
const toggleTopControlsAndBreadcrumbs = (value: boolean): Thunk => (dispatch, getState) => {
  throttledAction(dispatch, getState, value)
}

export default toggleTopControlsAndBreadcrumbs
