import * as localForage from 'localforage'

// util
import {
  hashContext,
  sync,
  autoProse,
} from '../util.js'

export const toggleProseView = ({ cursor, proseViews = {}, thoughtIndex, contextIndex }, { value }) => {

  const proseViewsNew = { ...proseViews }
  const encoded = hashContext(cursor)

  if (proseViews[encoded]) {

    // allow manual override of autoprose
    if(autoProse(cursor, thoughtIndex, contextIndex)) {
      proseViewsNew[encoded] = false
      localForage.setItem('proseViews-' + encoded, false)
    }
    else {
      delete proseViewsNew[encoded] // eslint-disable-line fp/no-delete
      localForage.removeItem('proseViews-' + encoded)
    }
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
