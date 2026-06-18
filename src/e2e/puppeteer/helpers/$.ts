import { page } from '../session'

/** Performs a querySelector on the document. */
const $ = (selector: string) => page.$(selector)

export default $
