import ContextStep from './ContextStep'
import ThoughtId from './ThoughtId'

/**
 * A single step in a Path.
 *
 * An ordinary child step is the child's ThoughtId. A step that crosses a context view is a ContextStep, which tags the
 * Lexeme instance it lands on. Tagging the step is what makes a context-view Path distinguishable from a SimplePath
 * made of the same thoughts, both by `equalPath` and by `hashPath`.
 */
type PathStep = ThoughtId | ContextStep

export default PathStep
