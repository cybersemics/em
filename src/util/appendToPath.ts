import moize from 'moize'
import ContextStep from '../@types/ContextStep'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import isRoot from '../util/isRoot'
import { contextStep } from './pathStep'

/** Appends one or more child steps to a Path or SimplePath. Ensures ROOT is removed. */
const appendToPath = <T extends Path | SimplePath>(path: T | null, ...children: ThoughtId[]): T =>
  // unknown needed because variadic positioning does not satisfy minimum length requirement of Path
  // also needed for Branding to SimplePath
  !path || isRoot(path) ? (children as T) : ([...path, ...children] as unknown as T)

/**
 * Appends a step that crosses a context view, turning a Path into one that is no longer simple.
 *
 * @param lexemeContextId The Lexeme context rendered at the new position, e.g. the id of `b/m` for the row
 * `a/m~/b`. See ContextStep for why it is stored rather than the parent context.
 */
export const appendContextStep = (path: Path | null, lexemeContextId: ThoughtId): Path => {
  const step: ContextStep = contextStep(lexemeContextId)
  return (!path || isRoot(path) ? [step] : [...path, step]) as Path
}

// TODO: Using appendToPathMemoized causes the context view to disapppear.
// e.g. Activate the context view on /Virtual Assistance/Onboarding/Start
// We need to memoize to to avoid unnecessary child Thought re-renders.
export const appendToPathMemo = moize(appendToPath, {
  maxSize: 100,
  profileName: 'appendToPath',
})

export default appendToPath
