import Brand from './Brand'

/**
 * A Path step that crosses a context view.
 *
 * Stores a ThoughtId, exactly like an ordinary step — no Lexeme identifier is encoded, and resolving a Path never
 * consults a Lexeme. It is prefixed with `~` to mark the crossing.
 *
 * The id is that of the **Lexeme context**: the entry in `Lexeme.contexts` rendered at that position, e.g. the `m`
 * under `b` for the row `a/m~/b`. It is stored rather than the **parent context** (`b`, the thought the row displays)
 * because two Lexeme contexts can share a parent — `b/cat` and `b/Cats` both render under `b` — so only the Lexeme
 * context addresses a rendered row uniquely. The parent context is recovered in O(1) from its `parentId`.
 *
 * See: util/pathStep.ts for the constructor and accessors.
 */
type ContextStep = string & Brand<'ContextStep'>

export default ContextStep
