import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import componentToThought from '../util/componentToThought'
import owner from '../util/owner'

/** Parses the unranked path from the url. */
const decodeContextUrl = (state: State, pathname: string) => {
  const urlPathname = pathname.slice(1)
  const urlComponents = urlPathname.split('/')
  const urlOwner = urlComponents[0] || '~' // ~ represents currently authenticated user

  if (urlOwner !== owner()) {
    console.error(
      `decodeThoughtsUrl: owner does not match owner(). "${urlOwner}" !== "${owner()}". This is likely a regression, as they should always match.`,
    )
  }

  const urlPath = urlComponents.length > 1 ? urlComponents.slice(1) : [HOME_TOKEN]
  const pathUnranked = urlPath.map(componentToThought)

  return pathUnranked
}

export default decodeContextUrl
