import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { AlertText, AlertType, DropTarget } from '../constants'
import alert from './alert'

interface Payload {
  value: boolean
  draggingThought?: SimplePath
  hoveringPath?: Path
  hoverId?: DropTarget
  offset?: number
}

/** Sets dragInProgress. */
const dragInProgress = (state: State, { value, draggingThought, hoveringPath, hoverId, offset }: Payload): State => ({
  ...(value
    ? alert(state, { value: AlertText.DragAndDrop, alertType: AlertType.DragAndDropHint, showCloseLink: false })
    : state),
  dragInProgress: value,
  draggingThought,
  hoveringPath,
  hoverId,
  cursorOffset: offset || state.cursorOffset,
})

export default _.curryRight(dragInProgress)
