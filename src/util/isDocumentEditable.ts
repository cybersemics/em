import { owner, urlDataSource } from '../util'

/**
 * Returns true if the document can be edited. True if an external data source or public owner is not being loaded.
 */
export const isDocumentEditable = () =>
  !urlDataSource() && owner() === '~'
