/** Possible return values of a sort's comparator function */
export type ComparatorValue = 1 | -1 | 0

/** A standard comparator function used within sort */
export type ComparatorFunction<T> = (a: NonNullable<T>, b: NonNullable<T>) => ComparatorValue

/** Set of file types supported for exporting thoughts */
export type MimeType = 'text/plain' | 'text/html'

/** Generic type to allow null */
export type Nullable<T> = T | null

/** A very generic object. */
export type GenericObject<T = any> = {[key: string]: T}

/** An option that can selected to set the export format. */
export interface ExportOption {
  type: MimeType,
  label: string,
  extension: string,
}

