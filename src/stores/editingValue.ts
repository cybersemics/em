import ministore from './ministore'

/** A store that tracks the live editing value separately from the Redux store to avoid heavy selector recalculations when typing. */
const editingValueStore = ministore<string | null>(null)

export default editingValueStore
