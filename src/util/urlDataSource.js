/* Returns the src from the query string */
export default () =>
  new URLSearchParams(window.location.search).get('src')
