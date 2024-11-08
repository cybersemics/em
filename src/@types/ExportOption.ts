import MimeType from './MimeType'

/** An option that can selected to set the export format. */
interface ExportOption {
  type: MimeType
  label: string
  extension: string
}

export default ExportOption
