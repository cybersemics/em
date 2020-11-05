// import util functios directly since importing from ../util/index causes circular dependency
import { owner } from '../util/owner'
import { urlDataSource } from '../util/urlDataSource'

/**
 * Returns true if the document can be edited. True if an external data source or public owner is not being loaded.
 */
export const isDocumentEditable = () =>
  !urlDataSource() && owner() === '~'
