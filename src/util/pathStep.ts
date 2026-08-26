/* eslint-disable import/prefer-default-export */
import ContextStep from '../@types/ContextStep'
import Path from '../@types/Path'
import PathStep from '../@types/PathStep'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import head from './head'

/** Marks a Path step as crossing a context view. Chosen because it cannot occur in a ThoughtId (a hex nanoid) and because the url already uses it for the same purpose. */
export const CONTEXT_STEP_PREFIX = '~'

/**
 * Creates a Path step that crosses a context view.
 *
 * @param lexemeContextId The Lexeme context rendered at the position, e.g. the id of `b/m` for the row `a/m~/b`.
 * Not the parent context (`b`) that the row displays — see ContextStep.
 */
export const contextStep = (lexemeContextId: ThoughtId): ContextStep =>
  `${CONTEXT_STEP_PREFIX}${lexemeContextId}` as ContextStep

/**
 * Returns true if a Path step crosses a context view.
 *
 * Tolerates an absent step so that it behaves like `head`, which returns undefined for the empty array that `parentOf`
 * produces for a root child. Several reducers pass that straight through to `findDescendant` and rely on the undefined
 * propagating rather than throwing.
 */
export const isContextStep = (step: PathStep): step is ContextStep => !!step && step.startsWith(CONTEXT_STEP_PREFIX)

/** Returns the ThoughtId a Path step holds. For a context step this is the Lexeme context, e.g. `b/m` for the row `a/m~/b`, with the `~` stripped. Absent steps propagate, as in isContextStep. */
export const stepId = (step: PathStep): ThoughtId =>
  (isContextStep(step) ? step.slice(CONTEXT_STEP_PREFIX.length) : step) as ThoughtId

/** Returns true if a Path crosses no context views, i.e. every step is an ordinary child step. Unlike the SimplePath brand, this is checkable at runtime. */
export const isSimplePath = (path: Path): path is SimplePath => !path.some(isContextStep)

/** Strips the context steps from a Path, leaving the ids of the thoughts it lands on. Note that the result is not a SimplePath: the ids are not contiguous across a context view. */
export const pathIds = (path: Path): ThoughtId[] => path.map(stepId)

/**
 * Returns a Path with its head replaced by another thought at the same position, preserving whether that step crosses
 * a context view.
 *
 * This is the sibling-navigation primitive: a sibling of a context in the context view is reached the same way the
 * context itself was, so `appendToPath(parentOf(path), sibling.id)` is only correct in normal view.
 */
export const replaceHead = (path: Path, id: ThoughtId): Path => {
  const step = isContextStep(head(path)) ? contextStep(id) : id
  return (path.length === 1 ? [step] : [...path.slice(0, -1), step]) as unknown as Path
}

/** Appends raw Path steps to a Path, preserving whether each one crosses a context view. Use when relocating a path under a new ancestor, where the steps being moved are already known. */
export const appendSteps = (path: Path, ...steps: PathStep[]): Path =>
  (steps.length === 0 ? path : [...path, ...steps]) as unknown as Path

/** Returns the index of the last step that crosses a context view, or -1 if the Path crosses none. Everything after it is an ordinary chain of children within one context. */
export const lastContextStepIndex = (path: Path): number => {
  for (let i = path.length - 1; i >= 0; i--) {
    if (isContextStep(path[i])) return i
  }
  return -1
}
