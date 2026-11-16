import Path from '../@types/Path'
import State from '../@types/State'
import getContextViewExpansion from '../selectors/getContextViewExpansion'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import keyValueBy from '../util/keyValueBy'

/** Rebases or removes unfolded routes within the mutation that changed their stored thoughts. */
const reconcileContextViewExpansions = (
  state: State,
  previousState: State,
  rebase: (path: Path) => Path = path => path,
): State => {
  const previous = Object.values(state.contextViewExpansions)
  if (previous.length === 0) return state

  const mapped = previous.map(expansion => ({ ...expansion, contextViewPath: rebase(expansion.contextViewPath) }))
  const changedOwners = previous
    .map((expansion, index) => ({
      from: hashPath(expansion.contextViewPath),
      to: hashPath(mapped[index].contextViewPath),
    }))
    .filter(change => change.from !== change.to)
    .sort((a, b) => b.from.length - a.from.length)
  const contextViews = keyValueBy(state.contextViews, (key, value) => {
    const change = changedOwners.find(change => key.startsWith(change.from))
    return { [change ? change.to + key.slice(change.from.length) : key]: value }
  })
  const invalid = mapped.filter(expansion => {
    const owner = getThoughtById(state, head(expansion.contextViewPath))
    const destinationPath = thoughtToPath(state, expansion.contextId)
    const rootId = getThoughtById(state, destinationPath[0])?.parentId
    return (
      !contextViews[hashPath(expansion.contextViewPath)] ||
      !owner ||
      !getThoughtById(state, expansion.contextId) ||
      !getThoughtById(state, expansion.ancestorId) ||
      !getContexts(state, owner.value).includes(expansion.contextId) ||
      (!destinationPath.includes(expansion.ancestorId) &&
        !(isRoot([expansion.ancestorId]) && expansion.ancestorId === rootId))
    )
  })
  const invalidPrefixes = invalid.map(expansion =>
    hashPath([...expansion.contextViewPath, expansion.contextId] as Path),
  )
  const retained = mapped.filter(
    expansion =>
      !invalid.includes(expansion) &&
      !invalidPrefixes.some(prefix => hashPath(expansion.contextViewPath).startsWith(prefix)),
  )
  const expansions = keyValueBy(retained, expansion => ({
    [hashPath([...expansion.contextViewPath, expansion.contextId] as Path)]: expansion,
  }))

  /** Drops an invalid display route while keeping its surviving selected thought. */
  const resolve = (path: Path): Path =>
    invalidPrefixes.some(prefix => hashPath(path).startsWith(prefix)) && getThoughtById(state, head(path))
      ? thoughtToPath(state, head(path))
      : path

  /** Resolves selected routes and re-keys their selection index. */
  const resolveIndex = (paths: State['multicursors']) =>
    keyValueBy(Object.values(paths), path => {
      const resolved = resolve(path)
      return getThoughtById(state, head(resolved)) ? { [hashPath(resolved)]: resolved } : null
    })
  const priorFrame = getContextViewExpansion(previousState, previousState.cursor)
  const priorFrameRetained =
    priorFrame &&
    retained.some(
      expansion =>
        expansion.contextId === priorFrame.contextId &&
        hashPath(expansion.contextViewPath) === hashPath(rebase(priorFrame.contextViewPath)),
    )
  const survivingSelection = previousState.cursor && getThoughtById(state, head(previousState.cursor))
  return {
    ...state,
    contextViewExpansions: expansions,
    contextViews: keyValueBy(contextViews, (key, value) =>
      invalidPrefixes.some(prefix => key.startsWith(prefix)) ? null : { [key]: value },
    ),
    cursor:
      priorFrame && !priorFrameRetained && survivingSelection
        ? thoughtToPath(state, survivingSelection.id)
        : state.cursor && resolve(state.cursor),
    multicursors: resolveIndex(state.multicursors),
    multicursorRange: resolveIndex(state.multicursorRange),
    multicursorAnchor: state.multicursorAnchor && resolve(state.multicursorAnchor),
  }
}

export default reconcileContextViewExpansions
