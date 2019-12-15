import * as localForage from 'localforage'

// util
import {
  hashContext,
  sync,
  pathToContext,
} from '../util.js'

export const toggleProseView = ({ cursor, proseViews }, { value }) => {

  const proseViewsNew = { ...proseViews }
  const encoded = hashContext(pathToContext(cursor))

  if (encoded in (proseViews || {})) {
    delete proseViewsNew[encoded] // eslint-disable-line fp/no-delete
    localForage.removeItem('proseViews-' + encoded)
  }
  else {
    proseViewsNew[encoded] = true
    localForage.setItem('proseViews-' + encoded, true)
  }

  setTimeout(() => {
    sync({}, {}, {
      updates: {
        proseViews: proseViewsNew,
      },
      state: false
    })

  })

  return {
    proseViews: proseViewsNew
  }
}
