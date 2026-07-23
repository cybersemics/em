import ministore from './ministore'

/** A store that is used to suppress the Editable change handler to ignore execCommand in registerNativeUndoStep. */
const suppressChange = ministore(false)

export default suppressChange
