/** Returns the src from the query string. */
export const urlDataSource = () =>
  typeof window !== 'undefined' && typeof URLSearchParams !== 'undefined'
    ? new URLSearchParams(window.location.search).get('src')
    : ''
