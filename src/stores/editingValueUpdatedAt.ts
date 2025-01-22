import reactMinistore from './react-ministore'

/** A store for the timestamp of the last editing value update to track the live editing value separately from the Redux store to avoid heavy selector recalculations when typing. */
const editingValueStoreUpdatedAt = reactMinistore<number | null>(null)

export default editingValueStoreUpdatedAt
