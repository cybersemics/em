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
      const hasInviteGenerated = Object.keys(snapshot.val() || []).length !== 0
      dispatch(userInvite({ invitationCodeDetail: hasInviteGenerated ? { id: inviteId, ...snapshot.val() } : {} }))
    })
  }

export default getInviteById
