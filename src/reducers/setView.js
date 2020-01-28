// util
import {
  hashContext,
  pathToContext,
} from '../util.js'

export default (state, { value }) => {

  if (!state.cursor) return

  const context = pathToContext(state.cursor)
  const encoded = hashContext(context)

  return {
    contexts: {
      ...state.contexts,
      [encoded]: {
        ...state.contexts[encoded],
        view: value
      }
    }
  }
}
