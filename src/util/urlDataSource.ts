/** Returns the src from the query string. */
export const urlDataSource = () =>
  new URLSearchParams(window.location.search).get('src')
