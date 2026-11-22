import CommandSortType from '../@types/CommandSortType'
import reactMinistore from './react-ministore'

/** Search and sorting for the current Command Universe session, retained across page visits. */
const commandUniverseSearchSortStore = reactMinistore<{ search: string; sortOrder: CommandSortType }>({
  search: '',
  sortOrder: 'type',
})

export default commandUniverseSearchSortStore
