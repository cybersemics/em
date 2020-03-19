import { store } from '../store'

// real time editing value
export const setEditingValue = value => store.dispatch({ type: 'editingValue', value })
