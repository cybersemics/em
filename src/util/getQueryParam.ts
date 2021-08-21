/**
 * Returns value for the given query param from the current window location search.
 */
export const getQueryParam = (param: string) => {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(param)
}
