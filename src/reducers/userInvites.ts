import _ from 'lodash'
import { InviteCodes, State } from '../@types'

/** Sets invites for login user. */
const userInvites = (state: State, { userInvite = {} }: { userInvite: InviteCodes }) => ({
  ...state,
  userInvites:
    Object.keys(userInvite).length === 0
      ? []
      : state.userInvites
      ? [...state.userInvites, ...[userInvite]]
      : [...[userInvite]],
})

export default _.curryRight(userInvites)
