import moize from 'moize'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import isRoot from '../util/isRoot'
import { resolveArray } from './memoizeResolvers'

/** Appends one or more Child nodes to a Path or SimplePath. Ensures ROOT is removed. */
const appendToPath = <T extends Path | SimplePath>(path: T | null, ...children: ThoughtId[]): T =>
  // unknown needed because variadic positioning does not satisfy minimum length requirement of Path
  // also needed for Branding to SimplePath
  !path || isRoot(path) ? (children as T) : ([...path, ...children] as unknown as T)

// memoize to avoid child Thought re-renders
const appendToPathMemoized = moize(appendToPath, {
  maxSize: 1000,
  profileName: 'appendToPath',
  transformArgs: ([path, ...children]) => [path && resolveArray(path), ...resolveArray(children)],
})

export default appendToPathMemoized
