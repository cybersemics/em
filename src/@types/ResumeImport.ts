import Path from './Path'

/** Meta information for a file import that is stored in localStorage, with its raw text in IDB, and automatically resumed on initialize. */
interface ResumeImport {
  /** Unique id for the import.
      Importing the same file a second time will generate a new ResumeImport with a new id. */
  id: string
  /** Insert the imported thoughts before the path instead of as children of the path. Creates a new empty thought to import into. */
  insertBefore?: boolean
  lastModified: number
  /** Number of thoughts that have already been imported. */
  thoughtsImported: number
  name: string
  /** Import destination path. */
  path: Path
  size: number
}

export default ResumeImport
