import ThoughtId from '../../@types/ThoughtId'

/** Generates a documentName for a given thought. */
export const encodeThoughtDocumentName = (tsid: string, id: ThoughtId) => `${tsid}/thought/${id}`

/** Generates a documentName for a given thought. */
export const encodeLexemeDocumentName = (tsid: string, key: string) => `${tsid}/lexeme/${key}`

/** Generates a documentName for a given thought. */
export const encodePermissionsDocumentName = (tsid: string) => `${tsid}/permissions`

/** Generates a documentName for a given thought. */
export const encodeDocLogDocumentName = (tsid: string) => `${tsid}/doclog`

/** Extracts the tsid from a document name. */
export const parseDocumentName = (
  documentName: string,
): { tsid: string; type: string | undefined; id: ThoughtId | string | undefined } => {
  const [tsid, type, id] = documentName.split('/')
  return { tsid, type, id }
}
