import reactMinistore from './react-ministore'

/** A store for the untrimmed editing value that tracks the live editing value separately from the Redux store to avoid heavy selector recalculations when typing. */
const editingValueStoreUntrimmed = reactMinistore<string | null>(null)

export default editingValueStoreUntrimmed
