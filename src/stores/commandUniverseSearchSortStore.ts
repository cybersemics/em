import CommandSortType from '../@types/CommandSortType'
import matchesBreakpoint from '../util/matchesBreakpoint'
import reactMinistore from './react-ministore'

/** Search and sorting for the Command Universe. The initial sort follows the viewport at app load; opening clears only search, preserving the chosen sort across sessions. */
const commandUniverseSearchSortStore = reactMinistore<{ search: string; sortOrder: CommandSortType }>({
  search: '',
  sortOrder: matchesBreakpoint('lg') ? 'recent' : 'type',
})

export default commandUniverseSearchSortStore
