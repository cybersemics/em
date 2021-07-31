import { userInvites } from '../action-creators'
import { Thunk, InviteCodes } from '../@types'

/**
 * Creates user invite codes when user is on referral page with no invitation code already existing.
 */
const createUserInvites =
  (newInviteCodes: InviteCodes[], uid: string): Thunk =>
  dispatch => {
    newInviteCodes.forEach(({ id: inviteId, ...newInviteCode }) => {
      window.firebase.database().ref(`/invites/${inviteId}`).set(newInviteCode)
      window.firebase.database().ref(`/users/${uid}/invites/${inviteId}`).set(true)

      dispatch(
        userInvites({
          userInvite: {
            id: inviteId,
            ...newInviteCode,
          },
        }),
      )
    })
  }

export default createUserInvites
