import { clientId } from '../browser.js'
import { store } from '../store.js'
import {
  EMPTY_TOKEN,
  RENDER_DELAY,
} from '../constants.js'

// util
import { timestamp } from './timestamp.js'
import { reduceObj } from './reduceObj.js'

/** prepends thoughtIndex and contextIndex keys for syncing to Firebase */
export const syncRemote = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, updates = {}, callback) => {

  const state = store.getState()

  const hasUpdates =
    Object.keys(thoughtIndexUpdates).length > 0 ||
    Object.keys(contextIndexUpdates).length > 0 ||
    Object.keys(updates).length > 0

  // prepend thoughtIndex/ and encode key
  const prependedDataUpdates = reduceObj(thoughtIndexUpdates, (key, value) => {
    return key ? {
        ['thoughtIndex/' + (key || EMPTY_TOKEN)]: value
      } : console.error('Unescaped empty key', value, new Error()) || {}
    }
  )
  const prependedcontextIndexUpdates = reduceObj(contextIndexUpdates, (key, value) => ({
    ['contextIndex/' + key]: value
  }))

  // add updates to queue appending clientId and timestamp
  const allUpdates = {
    // encode keys for firebase
    ...(hasUpdates ? {
      ...updates,
      ...prependedDataUpdates,
      ...prependedcontextIndexUpdates,
      // do not update lastClientId and lastUpdated if there are no thoughtIndex updates (e.g. just a settings update)
      // there are some trivial settings updates that get pushed to the remote when the app loads, setting lastClientId and lastUpdated, which can cause the client to ignore thoughtIndex updates from the remote thinking it is already up-to-speed
      // TODO: A root level lastClientId/lastUpdated is an overreaching solution.
      ...(Object.keys(thoughtIndexUpdates).length > 0 ? {
        lastClientId: clientId,
        lastUpdated: timestamp()
      } : null)
    } : {})
  }

  // if authenticated, execute all updates
  if (state.authenticated && Object.keys(allUpdates).length > 0) {

    // update may throw if updates do not validate
    try {
      state.userRef.update(allUpdates, (err, ...args) => {

        if (err) {
          store.dispatch({ type: 'error', value: err })
          console.error(err)
        }

        if (callback) {
          callback(err, ...args)
        }

      })
    }
    catch (e) {
      store.dispatch({ type: 'error', value: e.message })
      console.error(e.message)
    }
  }
  // invoke callback asynchronously whether online or not in order to not outrace re-render
  else if (callback) {
    setTimeout(callback, RENDER_DELAY)
  }
}
