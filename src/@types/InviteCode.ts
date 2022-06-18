import Timestamp from './Timestamp'

/** An object that contains an invite code details. */
interface InviteCode {
  id: string
  created: Timestamp
  createdBy: string
  used?: Timestamp
  usedBy?: string
  hasSeen?: boolean
}

export default InviteCode
