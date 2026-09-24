import reactMinistore from './react-ministore'

/**
 * A React mini-store that tracks the untrimmed (raw) value of the thought currently being edited.
 *
 * This store allows components to access and react to the original, unprocessed user input in real-time,
 * including any leading or trailing whitespace as the user types. This is particularly useful for features
 * that depend on the exact input value, such as live validation, character counts, or immediate feedback
 * based on the unmodified input.
 *
 * The stored value can be one of the following:
 * - `string`: The untrimmed text content of the thought currently being edited.
 * - `null`: Indicates that no thought is currently being edited.
 *
 * Usage:
 *
 * To keep your components synchronized with the live editing state, you can subscribe to this store using:.
 *
 * ```typescript
 * const editingValueUntrimmed = editingValueUntrimmedStore.useSelector(state => state);
 * ```
 *
 * This will provide your component with real-time access to the untrimmed value as the user types, allowing
 * for immediate reactions to user input without waiting for the overall application state to update.
 */
const editingValueUntrimmedStore = reactMinistore<string | null>(null)

export default editingValueUntrimmedStore
