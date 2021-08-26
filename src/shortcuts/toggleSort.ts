import { HOME_PATH } from '../constants'
import { simplifyPath, getSortPreference } from '../selectors'
import { deleteAttribute, setCursor, toggleAttribute } from '../action-creators'
import Icon from '../components/icons/Sort'
import { pathToContext, unroot } from '../util'
import { Shortcut, SortPreference } from '../@types'
import getGlobalSortPreference from '../selectors/getGlobalSortPreference'

/* Available sort preferences */
const sortPreferences = ['None', 'Alphabetical']

/** Decide next sort preference.
 None → Alphabetical
 Alphabetical/Asc → Alphabetical/Desc
 Alphabetical/Desc → None.
 */
const decideNextSortPreference = (currentSortPreference: SortPreference): SortPreference => {
  if (currentSortPreference.direction === 'Asc') {
    return {
      type: currentSortPreference.type,
      direction: 'Desc',
    }
  } else {
    const nextSortPreferenceType =
      sortPreferences[(sortPreferences.indexOf(currentSortPreference.type) + 1) % sortPreferences.length]
    return {
      type: nextSortPreferenceType,
      direction: nextSortPreferenceType === 'None' ? null : 'Asc',
    }
  }
}

const toggleSortShortcut: Shortcut = {
  id: 'toggleSort',
  label: 'Toggle Sort',
  description: 'Sort the current context alphabetically.',
  keyboard: { key: 's', meta: true, alt: true },
  svg: Icon,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    const simplePath = simplifyPath(state, cursor || HOME_PATH)
    const context = pathToContext(simplePath)
    const currentSortPreference = getSortPreference(state, context)
    const globalSortPreference = getGlobalSortPreference(state)
    const nextSortPreference = decideNextSortPreference(currentSortPreference)

    // If next sort preference equals to global sort preference then delete sort attribute.
    if (
      globalSortPreference.type === nextSortPreference.type &&
      globalSortPreference.direction === nextSortPreference.direction
    ) {
      dispatch(
        deleteAttribute({
          context: context,
          key: '=sort',
        }),
      )
    }
    // If next preference type is not equal to current preference type, toggle new sort type.
    // We need to have this control to not remove the sort type when switching between Alphabetical/Asc and Alphabetical/Desc
    else {
      // if next sort preference direction is null, toggle off sort direction
      !nextSortPreference.direction &&
        currentSortPreference.direction &&
        dispatch(
          toggleAttribute({
            context: unroot([...context, '=sort']),
            key: currentSortPreference.type,
            value: currentSortPreference.direction,
          }),
        )

      // If next sort preference type does not equal to current sort  then set =sort attribute.
      ;(nextSortPreference.type !== currentSortPreference.type ||
        nextSortPreference.type === globalSortPreference.type) &&
        dispatch(
          toggleAttribute({
            context: context,
            key: '=sort',
            value: nextSortPreference.type,
          }),
        )

      // if next sort preference direction is not null, toggle direction
      nextSortPreference.direction &&
        dispatch(
          toggleAttribute({
            context: unroot([...context, '=sort']),
            key: nextSortPreference.type,
            value: nextSortPreference.direction,
          }),
        )
    }

    if (cursor) {
      dispatch(setCursor({ path: state.cursor }))
    }
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state

    const context = pathToContext(cursor ? simplifyPath(state, cursor) : HOME_PATH)

    return getSortPreference(state, context).type === 'Alphabetical'
  },
}

export default toggleSortShortcut
