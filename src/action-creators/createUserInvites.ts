import { userInvites } from '../action-creators'
import { Thunk, InviteCodes } from '../@types'

/**
 * Creates user invite codes when user is on referral page with no invitation code already existing.
 */
const createUserInvites =
  (newInviteCode: InviteCodes, inviteId: string, uid: string): Thunk =>
  dispatch => {
    window.firebase.database().ref(`/invites/${inviteId}`).set(newInviteCode)
    window.firebase.database().ref(`/users/${uid}/invites/${inviteId}`).set(true)

    dispatch(
      userInvites({
        invite: {
          id: inviteId,
          ...newInviteCode,
        },
      }),
    )
  }

export default createUserInvites
