/* Returns the publish mode query string */
export const publishMode = () =>
  new URLSearchParams(window.location.search).get('publish') != null
