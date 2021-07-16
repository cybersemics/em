import _ from 'lodash'
import { InviteCodes, State } from '../@types'

/** Sets invites for login user. */
const userInvite = (state: State, { invite }: { invite: InviteCodes }) => ({
  ...state,
  invite: Object.keys(invite).length === 0 ? {} : invite,
})

export default _.curryRight(userInvite)
