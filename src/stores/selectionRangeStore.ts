import _ from 'lodash'
import reactMinistore from './react-ministore'

/** A reactive store that can block long press when a non-collapsed selection range is active. */
const selectionRangeStore = reactMinistore<boolean>(false)

export default selectionRangeStore
