import { ROOT_TOKEN } from '../constants'
import { componentToThought, hashContext, keyValueBy, owner } from '../util'
import { rankThoughtsFirstMatch } from '../selectors'
import { State } from '../util/initialState'

/** Parses the thoughts from the url. */
const decodeThoughtsUrl = (state: State, pathname: string) => {
  const urlPathname = pathname.slice(1)
  const urlComponents = urlPathname.split('/')
  const urlOwner = urlComponents[0] || '~' // ~ represents currently authenticated user

  if (urlOwner !== owner()) {
    console.error(`decodeThoughtsUrl: owner does not match owner(). "${urlOwner}" !== "${owner()}". This is likely a regression, as they should always match.`)
  }

  const urlPath = urlComponents.length > 1 ? urlComponents.slice(1) : [ROOT_TOKEN]
  const pathUnranked = urlPath.map(componentToThought)
  const contextViews = keyValueBy(urlPath, (cur, i) =>
    /~$/.test(cur) ? {
      [hashContext(pathUnranked.slice(0, i + 1))]: true
    } : null)

  // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
  const path = rankThoughtsFirstMatch({ ...state, contextViews }, pathUnranked)

  return {
    contextViews,
    path: path,
    owner: urlOwner,
  }
}

export default decodeThoughtsUrl
