import Role from './Role'

/** A set of permissons granted to an access token. */
interface Share {
  accessed?: number
  created: number
  name?: string
  role: Role
}

export default Share
