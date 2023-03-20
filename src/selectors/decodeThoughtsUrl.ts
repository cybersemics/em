import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import contextToThoughtId from '../selectors/contextToThoughtId'
import componentToThought from '../util/componentToThought'
import keyValueBy from '../util/keyValueBy'
import owner from '../util/owner'

interface Options {
  // if true, check that all thoughts in the path exist, otherwise return null
  exists?: boolean

  // the url to decode and convert to a Path. Defaults to window.location.pathname.
  url?: string
}

/** Parses the thoughts from the url. */
const decodeThoughtsUrl = (state: State, { exists, url }: Options = {}) => {
  url = url || window.location.href
  const urlRelative = url.replace(/^(?:\/\/|[^/]+)*(\/)?/, '')
  const urlWithoutQueryString = urlRelative.split('?')[0]
  const urlComponents = urlWithoutQueryString.split('/')
  const urlOwner = urlComponents[0] || '~' // ~ represents currently authenticated user

  if (urlOwner !== owner()) {
    console.error(
      `decodeThoughtsUrl: owner does not match owner(). "${urlOwner}" !== "${owner()}". This is likely a regression, as they should always match.`,
    )
  }

  const urlPath = urlComponents.length > 1 && urlWithoutQueryString.length > 3 ? urlComponents.slice(1) : [HOME_TOKEN]

  const pathUnranked = urlPath.map(componentToThought) as Path

  const contextViews = keyValueBy(urlPath, (cur, i) => {
    const thoughtId = contextToThoughtId(state, pathUnranked.slice(0, i + 1))
    return thoughtId && /~$/.test(cur)
      ? {
          [thoughtId]: true,
        }
      : null
  })

  // validate thoughts and set path to null if any are missing
  const thoughts = childIdsToThoughts(state, pathUnranked)
  const thoughtsValidated = thoughts.length === pathUnranked.length ? thoughts : null

  // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
  // if exists is specified and the thoughts are not yet loaded into state, return null
  const path = !exists || thoughtsValidated ? pathUnranked : null

  return {
    contextViews,
    path,
    owner: urlOwner,
  }
}

export default decodeThoughtsUrl
