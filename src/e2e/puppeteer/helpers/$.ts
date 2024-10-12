import { fetchPage } from './setup'

/** Performs a querySelector on the document. */
const $ = (selector: string) => fetchPage().$(selector)

export default $
