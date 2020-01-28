// util
import {
  expandThoughts,
  hashContext,
  pathToContext,
} from '../util.js'

export default (state, { value }) => {

  if (!state.cursor) return

  const context = pathToContext(state.cursor)
  const encoded = hashContext(context)
  const contextsNew = {
    ...state.contexts,
    [encoded]: {
      ...state.contexts[encoded],
      view: value
    }
  }

  return {
    expanded: expandThoughts(state.cursor, state.thoughtIndex, state.contextIndex, contextsNew),
    contexts: contextsNew
  }
}
