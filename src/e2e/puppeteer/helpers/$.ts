import { page } from '../setup'

/** Performs a querySelector on the document. */
const $ = (selector: string) => page.$(selector)

export default $
