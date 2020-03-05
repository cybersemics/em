import { store } from '../store.js'
import { error } from './error.js'

// util
import {
  contextOf,
  headRank,
  headValue,
  ellipsize,
  getRankAfter,
  meta,
  nextSibling,
  pathToContext,
  restoreSelection,
  rootedContextOf,
} from '../util.js'

export const moveThoughtDown = () => dispatch => {
  const { cursor } = store.getState()

  if (cursor) {

    const context = contextOf(cursor)
    const value = headValue(cursor)
    const rank = headRank(cursor)

    const nextThought = nextSibling(value, rootedContextOf(cursor), rank)
    if (nextThought) {

      // metaprogramming functions that prevent moving
      const thoughtMeta = meta(pathToContext(cursor))
      const contextMeta = meta(pathToContext(contextOf(cursor)))
      const globalSort = localStorage['Settings/Global Sort'] || 'None'
      const isSortEnabled = (contextMeta.sort && contextMeta.sort.hasOwnProperty('Alphabetical')) || globalSort === 'Alphabetical'

      if (isSortEnabled) {
        error(`Cannot moved subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" while sort is enabled.`)
        return
      }
      else if (thoughtMeta.readonly) {
        error(`"${ellipsize(headValue(cursor))}" is read-only and cannot be moved.`)
        return
      }
      else if (thoughtMeta.immovable) {
        error(`"${ellipsize(headValue(cursor))}" is immovable.`)
        return
      }
      else if (contextMeta.readonly && contextMeta.readonly.Subthoughts) {
        error(`Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are read-only and cannot be moved.`)
        return
      }
      else if (contextMeta.immovable && contextMeta.immovable.Subthoughts) {
        error(`Subthoughts of "${ellipsize(headValue(contextOf(cursor)))}" are immovable.`)
        return
      }

      // store selection offset before existingThoughtMove is dispatched
      const offset = window.getSelection().focusOffset

      const rankNew = getRankAfter(context.concat(nextThought))
      const newPath = context.concat({
        value,
        rank: rankNew
      })

      dispatch({
        type: 'existingThoughtMove',
        oldPath: cursor,
        newPath
      })

      restoreSelection(newPath, { offset })
    }
  }
}
