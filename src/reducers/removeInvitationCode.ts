import _ from 'lodash'
import { State } from '../@types'

/** Remove invitation code from store once user signed up. */
const removeInvitationCode = ({ invitationCode, ...restState }: State) => ({ ...restState })

export default _.curryRight(removeInvitationCode)
