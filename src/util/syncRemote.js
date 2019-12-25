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
export const syncRemote = (thoughtIndexUpdates = {}, contextIndexUpdates = {}, recentlyEditedUpdates = [], updates = {}, callback) => {

  const state = store.getState()

  const hasUpdates =
    Object.keys(thoughtIndexUpdates).length > 0 ||
    Object.keys(contextIndexUpdates).length > 0 ||
    Object.keys(updates).length > 0

  // prepend thoughtIndex/ and encode key
  const prependedDataUpdates = reduceObj(thoughtIndexUpdates, (key, thought) => {
    return key ? {
      // fix undefined/NaN rank
      ['thoughtIndex/' + (key || EMPTY_TOKEN)]: thought && state.settings.dataIntegrityCheck
        ? {
          lastUpdated: thought.lastUpdated || timestamp(),
          value: thought.value,
          contexts: thought.contexts.map(cx => ({
            context: cx.context,
            rank: cx.rank || 0, // guard against NaN or undefined
            ...(cx.lastUpdated ? {
              lastUpdated: cx.lastUpdated
            } : null)
          }))
        }
        : thought
    } : console.error('Unescaped empty key', thought, new Error()) || {}
  }
  )
  const prependedcontextIndexUpdates = reduceObj(contextIndexUpdates, (key, subthoughts) => ({
    // fix undefined/NaN rank
    ['contextIndex/' + key]: subthoughts && state.settings.dataIntegrityCheck
      ? subthoughts.map(subthought => ({
        value: subthought.value || '',
        rank: subthought.rank || 0, // guard against NaN or undefined
        ...(subthought.lastUpdated ? {
          lastUpdated: subthought.lastUpdated
        } : null)
      }))
      : subthoughts
  }))

  const prependedRecentlyEditedUpdates = { ["recentlyEdited"]: recentlyEditedUpdates }

  // add updates to queue appending clientId and timestamp
  const allUpdates = {
    // encode keys for firebase
    ...(hasUpdates ? {
      ...updates,
      ...prependedDataUpdates,
      ...prependedcontextIndexUpdates,
      ...prependedRecentlyEditedUpdates,
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
          console.error(err, allUpdates)
        }

        if (callback) {
          callback(err, ...args)
        }

      })
    }
    catch (e) {
      store.dispatch({ type: 'error', value: e.message })
      console.error(e.message, allUpdates)
    }
  }
  // invoke callback asynchronously whether online or not in order to not outrace re-render
  else if (callback) {
    setTimeout(callback, RENDER_DELAY)
  }
}
