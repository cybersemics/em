/**
 * Represents a single tab's configuration.
 */
export interface Tab<T extends string> {
  value: T
  label?: string
  showDot?: boolean
  content: React.ReactNode
}
