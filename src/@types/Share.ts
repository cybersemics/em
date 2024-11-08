import Role from './Role'
import Timestamp from './Timestamp'

/** A set of permissons granted to an access token. */
interface Share {
  accessed?: Timestamp
  created: Timestamp
  name?: string
  role: Role
}

export default Share
