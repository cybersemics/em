import _ from 'lodash'
import { InviteCodes, State } from '../@types'

/** Sets invites for login user. */
const userInvite = (state: State, { invitationCodeDetail }: { invitationCodeDetail: InviteCodes }) => ({
  ...state,
  invitationCodeDetail,
})

export default _.curryRight(userInvite)
