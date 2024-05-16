import _ from 'lodash'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertText, AlertType } from '../constants'
import alert from './alert'

interface Payload {
  value: boolean
  simplePath?: SimplePath
  sourceZone?: DragThoughtZone
}

/** Reducer for highlighting a bullet on click and hold. */
const dragHold = (state: State, { value = false, simplePath, sourceZone }: Payload) => ({
  ...(value
    ? alert(state, {
        value: sourceZone === DragThoughtZone.Thoughts ? AlertText.DragAndDrop : AlertText.ReorderFavorites,
        alertType: AlertType.DragAndDropHint,
        showCloseLink: false,
      })
    : state),
  dragHold: value,
  // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
  draggedSimplePath: state.draggedSimplePath ? (!simplePath ? undefined : state.draggedSimplePath) : simplePath,
})

/** Action-creator for dragHold. */
export const dragHoldActionCreator =
  (payload: Parameters<typeof dragHold>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'dragHold', ...payload })

export default _.curryRight(dragHold)
