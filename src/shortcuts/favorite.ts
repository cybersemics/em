import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import FavoritesIcon from '../components/icons/FavoritesIcon'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const favorite: Shortcut = {
  id: 'favorite',
  label: 'Add to Favorites',
  labelInverse: 'Remove from Favorites',
  description: 'Add the current thought to your Favorites list.',
  descriptionInverse: 'Remove the current thought from your Favorites list.',
  multicursor: {
    enabled: true,
    execMulticursor(cursors, dispatch, getState, e, {}, execAll) {
      const state = getState()
      const numThougths = cursors.length

      const allFavorites = cursors.map(cursor => findDescendant(state, head(cursor), '=favorite')).every(Boolean)

      execAll()

      dispatch(
        alert(
          allFavorites
            ? `Removed ${numThougths} thoughts from favorites.`
            : `Added ${numThougths} thoughts to favorites.`,
        ),
      )
    },
  },
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  isActive: state => {
    const cursor = state.cursor
    if (!cursor) return false
    const id = head(cursor)
    const isFavorite = findDescendant(state, id, '=favorite')
    return !!isFavorite
  },
  svg: FavoritesIcon,
  exec: (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor!
    const id = head(cursor)
    const thought = getThoughtById(state, id)
    const isFavorite = findDescendant(state, id, '=favorite')
    dispatch([
      // TODO: Fix single value to not overwrite other thought
      toggleAttribute({ path: cursor, values: ['=favorite', 'true'] }),
      alert(isFavorite ? `Removed ${thought.value} from favorites` : `Added ${thought.value} to favorites`),
    ])
  },
}

export default favorite
