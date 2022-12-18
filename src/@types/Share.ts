/** An access token for sharing a thoughtspace. */
interface Share {
  // ISOString
  accessed: string
  created: string
  name?: string
  role: 'owner'
}

export default Share
