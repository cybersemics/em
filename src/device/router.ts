export const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

/** Returns true if a link is to a thought within the user's thoughtspace. */
export const isInternalLink = (url: string) => typeof window === 'undefined' || url.startsWith(window.location.origin)

/** True if the current app is hosted on the same machine. */
export const isLocalNetwork =
  typeof window !== 'undefined' &&
  Boolean(
    window.location.hostname === 'localhost' ||
      window.location.hostname === 'bs-local.com' || // required for browserstack
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/) ||
      // 193.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.startsWith('127.168.1.'),
  )
