import { userInvites } from '.'
import { Thunk, Firebase } from '../@types'

/**
 * Loads user invites when user logs in.
 */
const getUserInvites =
  (uid: string): Thunk =>
  dispatch => {
    const userDb = window.firebase.database().ref(`users/${uid}`).child('invites')
    userDb.once('value', (snapshot: Firebase.Snapshot) => {
      const inviteCodes = Object.keys(snapshot.val() || {})

      if (inviteCodes.length === 0) {
        dispatch(userInvites({ userInvite: {} }))
      } else {
        inviteCodes.forEach((inviteCode: string) => {
          const invitesDb = window.firebase.database().ref(`invites/${inviteCode}`)
          invitesDb.once('value', (snapshot: Firebase.Snapshot) => {
            dispatch(
              userInvites({
                userInvite: {
                  id: inviteCode,
                  ...snapshot.val(),
                },
              }),
            )
          })
        })
      }
    })
  }

export default getUserInvites
