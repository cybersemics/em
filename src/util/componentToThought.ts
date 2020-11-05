/** Convert a single url component to an thought.
 * User entered "~" characters are double encoded.
 */
export const componentToThought = (component: string): string => {
  let value = '' // eslint-disable-line fp/no-let
  try {
    value = window.decodeURIComponent(window.decodeURIComponent(component.replace(/~|%25$/, '')))
  }
  catch (e) {
    console.error(e)
  }
  return value
}
