import { userInvite } from '../action-creators'
import { Thunk, Firebase } from '../@types'

/**
 * Loads user invites when user logs in.
 */
const getInviteById =
  (inviteId: string | null | undefined): Thunk =>
  dispatch => {
    const invitesDb = window.firebase.database().ref(`invites/${inviteId}`)
    invitesDb.once('value', (snapshot: Firebase.Snapshot) => {
      dispatch(
        userInvite({
          invite: {
            id: inviteId,
            ...snapshot.val(),
          },
        }),
      )
    })
  }

export default getInviteById
