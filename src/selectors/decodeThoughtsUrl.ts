import { ROOT_TOKEN } from '../constants'
import { componentToThought, hashContext, owner } from '../util'
import { rankThoughtsFirstMatch } from '../selectors'
import { State } from '../util/initialState'

/** Parses the thoughts from the url. */
export default (state: State, pathname: string) => {
  const urlPathname = pathname.slice(1)
  const urlComponents = urlPathname.split('/')
  const urlOwner = urlComponents[0] || '~' // ~ represents currently authenticated user

  if (urlOwner !== owner()) {
    console.error(`decodeThoughtsUrl: owner does not match owner(). "${urlOwner}" !== "${owner()}". This is likely a regression, as they should always match.`)
  }

  const urlPath = urlComponents.length > 1 ? urlComponents.slice(1) : [ROOT_TOKEN]
  const pathUnranked = urlPath.map(componentToThought)
  const contextViews = urlPath.reduce((accum, cur, i) =>
    /~$/.test(cur) ? {
      ...accum,
      [hashContext(pathUnranked.slice(0, i + 1))]: true
    } : accum,
  {})

  // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
  const thoughtsRanked = rankThoughtsFirstMatch({ ...state, contextViews }, pathUnranked)

  return {
    contextViews,
    thoughtsRanked,
    owner: urlOwner,
  }
}
