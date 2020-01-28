import localForage from 'localforage'

// util
import {
  hashContext,
  pathToContext,
} from '../util.js'

export default () => (dispatch, getState) => {
  const { cursor, contexts } = getState()

  if (cursor) {
    const context = pathToContext(cursor)
    const encoded = hashContext(context)
    const contextObject = contexts[encoded] || {}
    const view = contextObject.view === 'table' ? null : 'table'

    // persist locally
    localForage.setItem('contexts', {
      ...contexts,
      [encoded]: {
        ...contextObject,
        view
      }
    })

    dispatch({ type: 'setView', value: view })
  }

  return !!cursor
}
