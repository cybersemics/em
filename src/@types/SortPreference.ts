import SortDirection from './SortDirection'

/** Sort Preferences with type and direction. */
interface SortPreference {
  type: string
  direction: SortDirection | null
}

export default SortPreference
