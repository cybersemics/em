import { Timestamp } from './Timestamp'

/** An object that contains an invite code. */
export interface InviteCodes {
  id?: string // db only
  created?: Timestamp
  createdBy?: string
  used?: Timestamp
  usedBy?: string
}
