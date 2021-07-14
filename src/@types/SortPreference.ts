import { SortDirection } from './SortDirection'

/** Sort Preferences with type and direction. */
export interface SortPreference {
  type: string
  direction: SortDirection | null
}
