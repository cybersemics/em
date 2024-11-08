/** Returns the publish mode query string. */
const publishMode = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('publish') != null

export default publishMode
