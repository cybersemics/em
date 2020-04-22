/* Returns the publish mode query string */
export default () =>
  new URLSearchParams(window.location.search).get('publish') != null
