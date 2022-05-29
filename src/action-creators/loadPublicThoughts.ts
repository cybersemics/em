import { HOME_TOKEN } from '../constants'
import { createId, hashThought, owner } from '../util'
import { loadRemoteState } from '../action-creators'
import { Firebase, Thought, State, Thunk } from '../@types'
import { contextToThoughtId, getThoughtById } from '../selectors'

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
  const publicContextRef = window.firebase.database().ref(`users/${urlOwner}/thoughtIndex/${contextEncoded}`)

  // fetch children
  publicContextRef.once('value', (snapshot: Firebase.Snapshot<Thought>) => {
    const thought: Thought = snapshot.val()

    const state = getState()
    const remoteState: State = {
      ...state,
      thoughts: {
        thoughtIndex: {
          [HOME_TOKEN]: thought,
        },
        lexemeIndex: Object.values(thought.childrenMap).reduce((accum, childId) => {
          const thought = getThoughtById(state, childId)
          return {
            ...accum,
            [hashThought(thought.value)]: {
              id: thought.id || createId(),
              value: thought.value,
              contexts: [
                {
                  id: contextToThoughtId(state, [thought.value]),
                  context: [HOME_TOKEN],
                  rank: thought.rank,
                },
              ],
              lastUpdated: thought.lastUpdated,
            },
          }
        }, {}),
      },
    }

    dispatch(loadRemoteState(remoteState))
  })
}

export default loadPublicThoughts
