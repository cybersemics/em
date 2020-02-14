import { store } from '../store.js'

// action-creators
import { newThought } from './newThought'

// constants
import {
  RENDER_DELAY,
} from '../constants.js'

// util
import {
  contextOf,
  head,
} from '../util.js'

export const subCategorizeOne = () => (dispatch) => {
  const { cursor } = store.getState()
  const { rank } = dispatch(newThought({ insertBefore: true }))
  setTimeout(() => {
    dispatch({
      type: 'existingThoughtMove',
      oldPath: cursor,
      newPath: contextOf(cursor).concat({ value: '', rank }, head(cursor))
    })
  }, RENDER_DELAY)
}
