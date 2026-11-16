import Path from '../@types/Path'
import State from '../@types/State'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'

/** Finds the innermost registered unfolded entry crossed by a displayed route. */
const getContextViewExpansion = (state: State, path: Path | null) =>
  path
    ? Object.values(state.contextViewExpansions).reduce<(typeof state.contextViewExpansions)[string] | undefined>(
        (match, expansion) => {
          const index = expansion.contextViewPath.length
          return state.contextViews[hashPath(expansion.contextViewPath)] &&
            path.length > index + 1 &&
            equalPath(path.slice(0, index) as Path, expansion.contextViewPath) &&
            path[index] === expansion.contextId &&
            path[index + 1] === expansion.ancestorId &&
            (!match || index > match.contextViewPath.length)
            ? expansion
            : match
        },
        undefined,
      )
    : undefined

export default getContextViewExpansion
