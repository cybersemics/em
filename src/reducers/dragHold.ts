import _ from 'lodash'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
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

export default _.curryRight(dragHold)
