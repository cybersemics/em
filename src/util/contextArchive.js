import {
  attribute,
  pathToContext,
} from '../util.js'
import { store } from '../store'
import createAttribute from '../action-creators/createAttribute'

export const contextArchive = context => {
  const archive = attribute(context, '=archive')
  if (archive === undefined) {
    store.dispatch(createAttribute(pathToContext(context), '=archive'))
  }
  return attribute(context, '=archive')
}
