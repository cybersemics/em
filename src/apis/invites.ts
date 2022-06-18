import * as Firebase from '../@types/Firebase'
import InviteCode from '../@types/InviteCode'

/** Fetches the invite code by its id. */
export const getInviteById = (inviteCode: string) =>
  new Promise<InviteCode>((resolve, reject) => {
    const invitesDb = window.firebase.database().ref(`invites/${inviteCode}`)
    invitesDb.once('value', (snapshot: Firebase.Snapshot) => {
      const value = snapshot.val()
      if (!value) reject(new Error('InviteCode is invalid.'))
      resolve({
        id: inviteCode,
        ...snapshot.val(),
      })
    })
  })

/**
 * Updates the given invite code.
 */
export const updateInviteCode = ({ id, ...updatedInviteCode }: InviteCode) =>
  window.firebase.database().ref(`/invites/${id}`).set(updatedInviteCode)
