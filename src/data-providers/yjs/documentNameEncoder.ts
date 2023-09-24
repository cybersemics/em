import Index from '../../@types/IndexType'
import ThoughtId from '../../@types/ThoughtId'

type DocType = 'doclog' | 'permissions' | 'thought' | 'lexeme'

// DocType abbreviations to save storage space
const docTypeAbbrev: Index<DocType> = {
  t: 'thought',
  l: 'lexeme',
}

/** Generates a documentName for a thought. */
export const encodeThoughtDocumentName = (tsid: string, key: string) => `${tsid}/t/${key}`

/** Generates a documentName for a lexeme. */
export const encodeLexemeDocumentName = (tsid: string, key: string) => `${tsid}/l/${key}`

/** Generates a permissions documentName. */
export const encodePermissionsDocumentName = (tsid: string) => `${tsid}/permissions`

/** Generates a doclog documentName with an optional key for meta information (e.g. thoughtReplicationCursor). */
export const encodeDocLogDocumentName = (tsid: string, key?: string) => `${tsid}/doclog` + (key ? `/${key}` : '')

/** Generates a doclog block documentName with a unique key. */
export const encodeDocLogBlockDocumentName = (tsid: string, key: string) => `${tsid}/doclog/block/${key}`

/** Extracts the parts from a document name. */
export const parseDocumentName = (
  documentName: string,
): {
  /** Defined for all documents. Set to 'permissions' for server permissions doc. */
  tsid: string
  /** Defined for all documents except subdocs. */
  type: DocType | undefined
  /** Only defined for Thought and Lexeme documents. */
  id: ThoughtId | string | undefined
  /** Only defined for doclog subdocs. */
  blockId: string | undefined
} => {
  const [tsid, type, id, blockId] = documentName.split('/')
  // the server permissions doc has a simple docName of 'permissions', so we need to set the type manually instead of extracting it from the docName
  const typeNormalized = tsid === 'permissions' ? 'permissions' : docTypeAbbrev[type] || type || ''
  return { tsid, type: typeNormalized, id, blockId }
}
