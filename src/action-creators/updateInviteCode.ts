import { Thunk, Firebase } from '../@types'
import { timestamp } from '../util'

/**
 * Loads user invites when user logs in.
 */
const updateInviteCode =
  (uid: string, inviteId: string | null | undefined): Thunk =>
  () => {
    const invitesDb = window.firebase.database().ref(`invites/${inviteId}`)
    invitesDb.once('value', (snapshot: Firebase.Snapshot) => {
      window.firebase
        .database()
        .ref(`/invites/${inviteId}`)
        .set({
          ...snapshot.val(),
          used: timestamp(),
          usedBy: uid,
        })
    })
  }

export default updateInviteCode
