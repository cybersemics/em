import { store } from '../store'

// real time editing value
export const setEditingValue = value =>
  store.getState().editingValue !== value
    ? store.dispatch({ type: 'editingValue', value })
    : null
