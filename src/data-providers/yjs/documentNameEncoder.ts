import ThoughtId from '../../@types/ThoughtId'

type DocType = 'doclog' | 'permissions' | 'thought' | 'lexeme'

/** Generates a documentName for a thought. */
export const encodeThoughtDocumentName = (tsid: string, id: ThoughtId) => `${tsid}/thought/${id}`

/** Generates a documentName for a lexeme. */
export const encodeLexemeDocumentName = (tsid: string, key: string) => `${tsid}/lexeme/${key}`

/** Generates a permissions documentName. */
export const encodePermissionsDocumentName = (tsid: string) => `${tsid}/permissions`

/** Generates a doslog documentName with an optional key for meta information (e.g. thoughtReplicationCursor). */
export const encodeDocLogDocumentName = (tsid: string, key?: string) => `${tsid}/doclog` + (key ? `/${key}` : '')

/** Extracts the tsid from a document name. */
export const parseDocumentName = (
  documentName: string,
): { tsid: string; type: DocType | undefined; id: ThoughtId | string | undefined } => {
  const [tsid, type, id] = documentName.split('/')
  return { tsid, type: type as DocType, id }
}
