import ministore from './ministore'

/** Escape hatch to abandon imports when frozen, set from Settings. This is a workaround for a bug that has not been resolved. A ministore so that resetStores clears it between tests. */
const abandonImportStore = ministore(false)

export default abandonImportStore
