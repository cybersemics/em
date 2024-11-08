/** Gets the owner of the thoughts to be loaded. ~ represents an offline user. */
const owner = () => {
  if (typeof window === 'undefined') return '~'
  const urlComponents = window.location.pathname.split('/')
  return urlComponents[1] || '~'
}

export default owner
