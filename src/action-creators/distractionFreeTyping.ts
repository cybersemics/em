import _ from 'lodash'
import Thunk from '../@types/Thunk'

/** Throttled action to limit the number actions dispatched within a fixed time. */
const throttledAction = _.throttle(
  (dispatch, getState, value) => {
    const { distractionFreeTyping } = getState()
    if (distractionFreeTyping !== value) {
      dispatch({
        type: 'distractionFreeTyping',
        value,
      })
    }
  },
  100,
  { leading: false },
)

/** Hides the toolbar and nav bar to allow for distraction-free typing on desktop. */
const distractionFreeTyping =
  (value: boolean): Thunk =>
  (dispatch, getState) => {
    throttledAction(dispatch, getState, value)
  }

export default distractionFreeTyping
