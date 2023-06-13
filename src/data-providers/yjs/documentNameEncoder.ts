import Index from '../../@types/IndexType'
import ThoughtId from '../../@types/ThoughtId'

type DocType = 'doclog' | 'permissions' | 'thought' | 'lexeme'

// DocType abbreviations to save storage space
const docTypeAbbrev: Index<DocType> = {
  t: 'thought',
  l: 'lexeme',
}

/** Generates a documentName for a thought. */
export const encodeThoughtDocumentName = (tsid: string, id: ThoughtId) => `${tsid}/t/${id}`

/** Generates a documentName for a lexeme. */
export const encodeLexemeDocumentName = (tsid: string, key: string) => `${tsid}/l/${key}`

/** Generates a permissions documentName. */
export const encodePermissionsDocumentName = (tsid: string) => `${tsid}/permissions`

/** Generates a doclog documentName with an optional key for meta information (e.g. thoughtReplicationCursor). */
export const encodeDocLogDocumentName = (tsid: string, key?: string) => `${tsid}/doclog` + (key ? `/${key}` : '')

/** Extracts the tsid from a document name. */
export const parseDocumentName = (
  documentName: string,
): { tsid: string; type: DocType | undefined; id: ThoughtId | string | undefined } => {
  const [tsid, type, id] = documentName.split('/')
  return { tsid, type: docTypeAbbrev[type] || type, id }
}
