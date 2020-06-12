import { ROOT_TOKEN } from '../constants'
import { hashContext, hashThought, owner } from '../util'
import { ActionCreator, ParentEntry, Snapshot } from '../types'
import { PartialStateWithThoughts } from '../util/initialState'
import { loadRemoteState } from '../action-creators'

/**
 * Loads a public context when the url contains a userId of a different user.
 *
 * @example http://localhost:3000/m9S244ovF7fVrwpAoqoWxcz08s52/179771ba0a286b0d4df022cc294b67ad
 */
const loadPublicThoughts = (): ActionCreator => dispatch => {

  const urlComponents = window.location.pathname.split('/')
  const urlOwner = urlComponents[1] || '~'

  if (urlOwner !== owner()) {
    console.error(`loadPublicThoughts: owner does not match owner(). "${urlOwner}" !== "${owner()}". This is likely a regression, as they should always match.`)
  }

  // create a ref to a public context
  const contextEncoded = urlComponents[2]
  const publicContextRef = window.firebase.database().ref(`users/${urlOwner}/contextIndex/${contextEncoded}`)

  // fetch children
  publicContextRef.once('value', (snapshot: Snapshot<ParentEntry>) => {
    const parentEntry = snapshot.val()

    const remoteState: PartialStateWithThoughts = {
      thoughts: {
        contextIndex: {
          [hashContext([ROOT_TOKEN])]: parentEntry
        },
        thoughtIndex: parentEntry.children.reduce((accum, child) => ({
          ...accum,
          [hashThought(child.value)]: {
            value: child.value,
            contexts: [{
              context: [ROOT_TOKEN],
              rank: child.rank
            }],
            lastUpdated: child.lastUpdated,
          }
        }), {})
      }
    }

    dispatch(loadRemoteState(remoteState))
  })
}

export default loadPublicThoughts
