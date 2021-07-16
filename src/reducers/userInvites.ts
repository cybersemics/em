import _ from 'lodash'
import { InviteCodes, State } from '../@types'

/** Sets invites for login user. */
const userInvites = (state: State, { invite }: { invite: InviteCodes }) => ({
  ...state,
  invites: Object.keys(invite).length === 0 ? [] : [...state.invites, ...[invite]],
})

export default _.curryRight(userInvites)
