import Shortcut from '../@types/Shortcut'
import { alertActionCreator as alert } from '../actions/alert'
import { toggleAttributeActionCreator as toggleAttribute } from '../actions/toggleAttribute'
import StarIcon from '../components/icons/StarIcon'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const favorite: Shortcut = {
  id: 'favorite',
  label: 'Add to Favorites',
  labelInverse: 'Remove from Favorites',
  description: 'Add the current thought to your Favorites list.',
  descriptionInverse: 'Remove the current thought from your Favorites list.',
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  isActive: getState => {
    const state = getState()
    const cursor = state.cursor
    if (!cursor) return false
    const id = head(cursor)
    const isFavorite = findDescendant(state, id, '=favorite')
    return !!isFavorite
  },
  svg: StarIcon,
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
