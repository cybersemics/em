import SortPreference from '../@types/SortPreference'

/** Converts a sort preference into a user-facing undo/redo label. */
const sortPreferenceToUndoLabel = (sortPreference: SortPreference): string => {
  if (sortPreference.type === 'None') return 'Sort Manually'

  const direction = sortPreference.direction === 'Asc' ? '\u2191' : sortPreference.direction === 'Desc' ? '\u2193' : ''
  return `Sort by ${sortPreference.type}${direction ? ` ${direction}` : ''}`
}

export default sortPreferenceToUndoLabel
