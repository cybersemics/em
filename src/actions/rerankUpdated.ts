import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import updateThoughts from '../actions/updateThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getMovePlacement from '../selectors/getMovePlacement'
import getSortPreference from '../selectors/getSortPreference'
import getThoughtById from '../selectors/getThoughtById'
import isEmptyOrEmojiOnly from '../util/isEmptyOrEmojiOnly'

/** Re-ranks a thought whose lastUpdated was just bumped so that its rank still matches its context's sort condition. Only a context sorted by Updated is affected, since lastUpdated is its sort key; the bumped thought becomes the most recently updated of its siblings, which is last in rank order when ascending and first when descending. Other sort conditions compare values or immutable timestamps, so a bump cannot invalidate their ranks. Empty and emoji-only thoughts are sorted to their point of creation in every sort preference, so they are left in place. */
const rerankUpdated = (state: State, id: ThoughtId): State => {
  const thought = getThoughtById(state, id)
  if (!thought || isEmptyOrEmojiOnly(thought.value)) return state

  const sortPreference = getSortPreference(state, thought.parentId)
  if (sortPreference.type !== 'Updated') return state

  const siblings = getChildrenRanked(state, thought.parentId).filter(child => child.id !== id)
  if (siblings.length === 0) return state

  const rank = sortPreference.direction === 'Desc' ? siblings[0].rank - 1 : siblings[siblings.length - 1].rank + 1
  if (rank === thought.rank) return state

  return updateThoughts(state, {
    thoughtIndexUpdates: {
      [id]: {
        ...thought,
        rank,
      },
    },
    lexemeIndexUpdates: {},
    movePlacements: { [id]: getMovePlacement(state, thought.parentId, { id, rank }) },
    preventExpandThoughts: true,
  })
}

export default rerankUpdated
