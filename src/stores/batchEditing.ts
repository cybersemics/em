import ministore from './ministore'

/** A store that signals that multiple execCommand operations are in progress and should be treated as a single edit. While true, editThought actions
 * dispatched by thoughtChangeHandler in Editable have their mergePrev property set to true so that they will be merged in undoRedoEnhancer (#3904). */
const batchEditing = ministore(false)

export default batchEditing
