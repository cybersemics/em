import Path from '../@types/Path'
import ThoughtId from '../@types/ThoughtId'
import head from './head'
import { stepId } from './pathStep'

/**
 * Returns the id of the thought at the head of a Path.
 *
 * In the context view this is the Lexeme instance, e.g. `b/m` for the row `a/m~/b` — the thought whose children are
 * rendered beneath the row and which structural commands (delete, move, sort) operate on. For the thought that is
 * *displayed* and edited there (`b`), use selectors/contextThoughtId.
 */
const headId = (path: Path): ThoughtId => stepId(head(path))

export default headId
