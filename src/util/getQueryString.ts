/**
 * Returns query string from URL as object.
 */
export const getQueryStringParams = (passedURL: string) => {
  if (!passedURL) return {}
  const passedParams = passedURL.replace(/^\?/, '').split('&')
  const searchMap: { [x: string]: string | undefined } = {}
  passedParams.forEach(val => {
    const [key, value = ''] = val.split('=')
    searchMap[key.toLowerCase()] = value
  })
  return searchMap
}

export default getQueryStringParams
