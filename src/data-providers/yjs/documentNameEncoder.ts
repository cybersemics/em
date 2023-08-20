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
  // defined for all documents
  tsid: string
  // defined for all documents
  type: DocType | undefined
  // only defined for Thought and Lexeme documents
  id: ThoughtId | string | undefined
  // only defined for doclog subdocs
  blockId: string | undefined
} => {
  const [tsid, type, id, blockId] = documentName.split('/')
  return { tsid, type: docTypeAbbrev[type] || type, id, blockId }
}
