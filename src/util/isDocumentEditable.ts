import owner from '../util/owner'
import urlDataSource from '../util/urlDataSource'

/**
 * Returns true if the document can be edited. True if an external data source or public owner is not being loaded.
 */
const isDocumentEditable = () => !urlDataSource() && owner() === '~'

export default isDocumentEditable
