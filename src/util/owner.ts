/** Gets the owner of the thoughts to be loaded. ~ represents an offline user. */
export const owner = () => {
  const urlComponents = window.location.pathname.split('/')
  return urlComponents[1] || '~'
}
