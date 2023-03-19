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
  // Sets state.draggingThought. Either hoveringPath or file must be set if value is true.
  draggingThought?: SimplePath
  hoveringPath?: Path
  hoverZone?: DropThoughtZone
  // Sets state.draggingFile. Either hoveringPath or file must be set if value is true.
  draggingFile?: boolean
  offset?: number
  sourceZone?: DragThoughtZone
}

/** Sets state.dragInProgress to true. */
const dragInProgress = (
  state: State,
  { value, draggingThought, draggingFile, hoveringPath, hoverZone, offset, sourceZone }: DragInProgressPayload,
): State => ({
  ...(value
    ? alert(state, {
        value: sourceZone === DragThoughtZone.Thoughts ? AlertText.DragAndDrop : AlertText.ReorderFavorites,
        alertType: AlertType.DragAndDropHint,
        showCloseLink: false,
      })
    : state),
  dragInProgress: value,
  draggingFile: value && draggingFile,
  draggingThought,
  hoveringPath,
  hoverZone,
  cursorOffset: offset || state.cursorOffset,
})

export default _.curryRight(dragInProgress)
