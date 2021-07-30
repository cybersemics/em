import { Thunk, Firebase } from '../@types'
import { timestamp } from '../util'

/**
 * Updates user invite hasSeen when user clicks to see the invite.
 * Also updates invite used details when recipient has used the code.
 */
const updateInviteCode =
  (uid: string, inviteId: string | null | undefined, used: boolean): Thunk =>
  () => {
    const invitesDb = window.firebase.database().ref(`invites/${inviteId}`)
    invitesDb.once('value', (snapshot: Firebase.Snapshot) => {
      window.firebase
        .database()
        .ref(`/invites/${inviteId}`)
        .set({
          ...snapshot.val(),
          ...(used
            ? {
                used: timestamp(),
                usedBy: uid,
              }
            : {
                hasSeen: true,
              }),
        })
    })
  }

export default updateInviteCode
