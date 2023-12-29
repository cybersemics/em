import _ from 'lodash'
import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import editingValueStore from '../stores/editingValue'
import head from '../util/head'
import strip from '../util/strip'

type OverflowChild = {
  id: ThoughtId
  value: string
  label?: string
  isOverflow?: boolean
}

type OverflowPath = OverflowChild[]

/** Ellipsizes thoughts in a path by thoughtsLimit and charLimit. Complexity: O(n), but does not work if thoughtsLimit or charLimit are undefined. */
const useEllipsizedThoughts = (
  path: Path,
  { disabled, thoughtsLimit, charLimit }: { disabled?: boolean; thoughtsLimit?: number; charLimit?: number },
): OverflowPath => {
  // calculate if overflow occurs during ellipsized view
  // 0 if thoughtsLimit is not defined
  const thoughtsOverflow = thoughtsLimit && path.length > thoughtsLimit ? path.length - thoughtsLimit + 1 : 0

  const editingValue = editingValueStore.useState()

  // convert the path to a list of thought values
  // if editing, use the live editing value
  const thoughtValuesLive = useSelector(
    state =>
      path.map(id =>
        editingValue && state.cursor && id === head(state.cursor)
          ? editingValue
          : ((getThoughtById(state, id)?.value || null) as string | null),
      ),
    _.isEqual,
  )

  // if charLimit is exceeded then replace the remaining characters with an ellipsis
  const charLimitedThoughts: OverflowPath = path.map((id, i) => {
    const value = thoughtValuesLive[i]
    return {
      // It is possible that the thought is no longer in state, in which case value will be null.
      // The component is hopefully being unmounted, so the value shouldn't matter as long as it does not error out.
      value: value ?? '',
      id,
      // add ellipsized label
      ...(!disabled && value != null
        ? {
            label: strip(
              // subtract 2 so that additional '...' is still within the char limit
              value.length > charLimit! - 2 ? value.slice(0, charLimit! - 2) + '...' : value,
            ),
          }
        : {}),
    }
  })

  // after character limit is applied we need to remove the overflow thoughts if any and add isOverflow flag to render ellipsis at that position
  const ellipsizedThoughts: OverflowPath =
    thoughtsOverflow && !disabled
      ? charLimitedThoughts
          .slice(0, charLimitedThoughts.length - 1 - thoughtsOverflow)
          .concat({ isOverflow: true } as OverflowChild, charLimitedThoughts.slice(charLimitedThoughts.length - 1))
      : charLimitedThoughts

  return ellipsizedThoughts
}

export default useEllipsizedThoughts
