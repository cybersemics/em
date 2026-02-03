import _ from 'lodash'
import reactMinistore from './react-ministore'

/** A reactive store that can block long press when a non-collapsed selection range is active.
 * This will always be false on desktop, or if the selection range is active but collapsed.
 * It is invoked in a selectionchange event handler, and throttled by SELECTION_CHANGE_THROTTLE.
 */
const selectionRangeStore = reactMinistore<boolean>(false)

export default selectionRangeStore
