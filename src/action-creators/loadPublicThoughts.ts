import { HOME_TOKEN } from '../constants'
import { createId, hashContext, hashThought, owner } from '../util'
import { loadRemoteState } from '../action-creators'
import { Firebase, Parent, State, Thunk } from '../@types'

/**
 * Loads a public context when the url contains a userId of a different user.
 *
 * @example http://localhost:3000/m9S244ovF7fVrwpAoqoWxcz08s52/179771ba0a286b0d4df022cc294b67ad
 */
const loadPublicThoughts = (): Thunk => (dispatch, getState) => {
  const urlComponents = window.location.pathname.split('/')
  const urlOwner = urlComponents[1] || '~'

  if (urlOwner !== owner()) {
    console.error(
      `loadPublicThoughts: owner does not match owner(). "${urlOwner}" !== "${owner()}". This is likely a regression, as they should always match.`,
    )
  }

  // create a ref to a public context
  const contextEncoded = urlComponents[2]
  const publicContextRef = window.firebase.database().ref(`users/${urlOwner}/contextIndex/${contextEncoded}`)

  // fetch children
  publicContextRef.once('value', (snapshot: Firebase.Snapshot<Parent>) => {
    const parentEntry: Parent = snapshot.val()

    const state = getState()
    const remoteState: State = {
      ...state,
      thoughts: {
        contextIndex: {
          [hashContext([HOME_TOKEN])]: parentEntry,
        },
        thoughtIndex: parentEntry.children.reduce(
          (accum, child) => ({
            ...accum,
            [hashThought(child.value)]: {
              id: parentEntry.id || createId(),
              value: child.value,
              contexts: [
                {
                  id: hashContext([child.value]),
                  context: [HOME_TOKEN],
                  rank: child.rank,
                },
              ],
              lastUpdated: child.lastUpdated,
            },
          }),
          {},
        ),
      },
    }

    dispatch(loadRemoteState(remoteState))
  })
}

export default loadPublicThoughts
