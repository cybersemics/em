import { MimeType } from './MimeType'

/** An option that can selected to set the export format. */
export interface ExportOption {
  type: MimeType
  label: string
  extension: string
}
