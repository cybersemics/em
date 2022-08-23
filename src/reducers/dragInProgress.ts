import _ from 'lodash'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { AlertText, AlertType } from '../constants'
import alert from './alert'

export interface DragInProgressPayload {
  value: boolean
  draggingThought?: SimplePath
  hoveringPath?: Path
  hoverZone?: DropThoughtZone
  offset?: number
  sourceZone?: DragThoughtZone
}

/** Sets dragInProgress. */
const dragInProgress = (
  state: State,
  { value, draggingThought, hoveringPath, hoverZone, offset, sourceZone }: DragInProgressPayload,
): State => ({
  ...(value
    ? alert(state, {
        value: sourceZone === DragThoughtZone.Content ? AlertText.DragAndDrop : AlertText.ReorderFavorites,
        alertType: AlertType.DragAndDropHint,
        showCloseLink: false,
      })
    : state),
  dragInProgress: value,
  draggingThought,
  hoveringPath,
  hoverZone,
  cursorOffset: offset || state.cursorOffset,
})

export default _.curryRight(dragInProgress)
