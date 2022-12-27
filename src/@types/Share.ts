import Role from './Role'

/** An access token for sharing a thoughtspace. */
interface Share {
  // ISOString
  accessed?: string
  created: string
  name?: string
  role: Role
}

export default Share
