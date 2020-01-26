import * as localForage from 'localforage'

// util
import {
  contextOf,
  getThoughts,
  hashContext,
  sync,
  autoProse,
} from '../util.js'

export default ({ cursor, proseViews = {}, thoughtIndex, contextIndex }, { value }) => {

  if (!cursor) return

  // if the cursor is on a leaf, activate prose view for the parent
  const path = cursor.length > 1 && getThoughts(cursor, thoughtIndex, contextIndex).length === 0
    ? contextOf(cursor)
    : cursor

  const proseViewsNew = { ...proseViews }
  const encoded = hashContext(path)
  const auto = autoProse(path, thoughtIndex, contextIndex)

  // force on
  if (!auto && !proseViews[encoded]) {
    proseViewsNew[encoded] = true
    localForage.setItem('proseViews-' + encoded, true)
  }
  // force off
  else if (auto && (proseViews[encoded] || !(encoded in proseViews))) {
    proseViewsNew[encoded] = false
    localForage.setItem('proseViews-' + encoded, false)
  }
  // off unless auto
  else {
    delete proseViewsNew[encoded] // eslint-disable-line fp/no-delete
    localForage.removeItem('proseViews-' + encoded)
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
