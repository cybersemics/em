import * as db from '../data-providers/dexie'
import dbGetThought from '../data-providers/data-helpers/getLexeme'

/**
 * Get thought from db for given thought value.
 */
const getLexemeFromDB = (thought: string) => dbGetThought(db, thought)

export default getLexemeFromDB
