import { token } from '../../styled-system/tokens'
import CommandSortType from '../@types/CommandSortType'
import reactMinistore from './react-ministore'

/** Search and sorting for the Command Universe. The initial sort follows the viewport at app load; opening clears only search, preserving the chosen sort across sessions. */
const commandUniverseSearchSortStore = reactMinistore<{ search: string; sortOrder: CommandSortType }>({
  search: '',
  sortOrder:
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${token('breakpoints.lg')})`).matches
      ? 'recent'
      : 'type',
})

export default commandUniverseSearchSortStore
