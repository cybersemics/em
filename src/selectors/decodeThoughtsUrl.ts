import { HOME_TOKEN } from '../constants'
import { componentToThought, keyValueBy, owner } from '../util'
import { Path, State } from '../@types'
import { childIdsToThoughts, contextToThought } from '../selectors'

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
  const urlComponents = urlRelative.split('/')
  const urlOwner = urlComponents[0] || '~' // ~ represents currently authenticated user

  if (urlOwner !== owner()) {
    console.error(
      `decodeThoughtsUrl: owner does not match owner(). "${urlOwner}" !== "${owner()}". This is likely a regression, as they should always match.`,
    )
  }

  const urlPath = urlComponents.length > 1 ? urlComponents.slice(1) : [HOME_TOKEN]

  const pathUnranked = urlPath.map(componentToThought) as Path

  const contextViews = keyValueBy(urlPath, (cur, i) => {
    const thought = contextToThought(state, pathUnranked.slice(0, i + 1))
    return thought && /~$/.test(cur)
      ? {
          [thought.id]: true,
        }
      : null
  })

  const thoughtRanked = childIdsToThoughts(state, pathUnranked)
  // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
  // if exists is specified and the thoughts are not yet loaded into state, return null
  const path = !exists || thoughtRanked ? pathUnranked : null

  return {
    contextViews,
    path: path,
    owner: urlOwner,
  }
}

export default decodeThoughtsUrl
