// action-creators
import { newThought } from './newThought'
import { error } from './error'

// util
import {
  contextOf,
  ellipsize,
  head,
  headValue,
  meta,
  pathToContext,
  isEM,
  isRoot
} from '../util.js'

export const subCategorizeOne = ({ thoughtsRanked }) => dispatch => {

  if (!thoughtsRanked) return

  // Cancel if a direct child of EM_TOKEN or ROOT_TOKEN
  if (isEM(contextOf(thoughtsRanked)) || isRoot(contextOf(thoughtsRanked))) {
    error(`Subthoughts of the "${isEM(contextOf(thoughtsRanked)) ? 'em' : 'home'} context" may not be de-indented.`)
    return
  }
  // cancel if parent is readonly
  else if (meta(pathToContext(contextOf(thoughtsRanked))).readonly) {
    error(`"${ellipsize(headValue(contextOf(thoughtsRanked)))}" is read-only so "${headValue(thoughtsRanked)}" cannot be subcategorized.`)
    return
  }
  else if (meta(pathToContext(contextOf(thoughtsRanked))).unextendable) {
    error(`"${ellipsize(headValue(contextOf(thoughtsRanked)))}" is unextendable so "${headValue(thoughtsRanked)}" cannot be subcategorized.`)
    return
  }

  const { rank } = dispatch(newThought({ insertBefore: true }))

  dispatch(({
    type: 'existingThoughtMove',
    oldPath: thoughtsRanked,
    newPath: contextOf(thoughtsRanked).concat({ value: '', rank }, head(thoughtsRanked))
  }))
}
