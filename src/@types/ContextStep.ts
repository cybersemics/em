import Brand from './Brand'

/**
 * A Path step that crosses a context view.
 *
 * Encoded as the ThoughtId of the Lexeme instance rendered at that position, prefixed with `~`. For example, the row
 * `a/m~/b` is the Path `[a, m, ~<id of b/m>]`. The instance is stored rather than the context (`b`) because two
 * contexts can be the same thought — `b/cat` and `b/Cats` both render under the context `b` — so only the instance
 * addresses a rendered row uniquely.
 *
 * See: util/pathStep.ts for the constructor and accessors.
 */
type ContextStep = string & Brand<'ContextStep'>

export default ContextStep
