import owner from '../util/owner'

/**
 * Returns true if the document can be edited. True if a public owner is not being loaded.
 */
const isDocumentEditable = () => owner() === '~'

export default isDocumentEditable
