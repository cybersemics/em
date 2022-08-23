import _ from 'lodash'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { AlertText, AlertType } from '../constants'
import alert from './alert'

interface Payload {
  value: boolean
  draggingThought?: SimplePath
  hoveringPath?: Path
  hoverZone?: DropThoughtZone
  offset?: number
}

/** Sets dragInProgress. */
const dragInProgress = (state: State, { value, draggingThought, hoveringPath, hoverZone, offset }: Payload): State => ({
  ...(value
    ? alert(state, { value: AlertText.DragAndDrop, alertType: AlertType.DragAndDropHint, showCloseLink: false })
    : state),
  dragInProgress: value,
  draggingThought,
  hoveringPath,
  hoverZone,
  cursorOffset: offset || state.cursorOffset,
})

export default _.curryRight(dragInProgress)
