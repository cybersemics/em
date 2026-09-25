import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import nonNull from '../util/nonNull'
import parseJsonSafe from '../util/parseJsonSafe'
import getLexeme from './getLexeme'
import getSetting from './getSetting'
import getThoughtById from './getThoughtById'

/** Returns live favorite marker ids in saved order, appending unsaved favorites by creation time and id. */
const getFavoriteIds = (state: State): ThoughtId[] => {
  const favorites = (getLexeme(state, '=favorite')?.contexts ?? [])
    .map(id => getThoughtById(state, id))
    .filter(nonNull)
    .sort((a, b) => a.created - b.created || a.id.localeCompare(b.id))
  const liveIds = new Set(favorites.map(thought => thought.id))
  const saved: unknown = parseJsonSafe(getSetting(state, 'Favorites Order') ?? null)
  const savedIds = Array.isArray(saved)
    ? saved.filter((id): id is ThoughtId => typeof id === 'string' && liveIds.has(id as ThoughtId))
    : []

  return [...new Set([...savedIds, ...liveIds])]
}

export default getFavoriteIds
