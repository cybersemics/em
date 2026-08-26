import Index from '../@types/IndexType'
import Path from '../@types/Path'
import PathStep from '../@types/PathStep'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import childIdsToThoughts from '../selectors/childIdsToThoughts'
import componentToThought from '../util/componentToThought'
import hashPath from '../util/hashPath'
import hashThought from '../util/hashThought'
import keyValueBy from '../util/keyValueBy'
import owner from '../util/owner'
import { contextStep, pathIds } from '../util/pathStep'
import getContexts from './getContexts'
import getThoughtById from './getThoughtById'

interface Options {
  // if true, check that all thoughts in the path exist, otherwise return null
  exists?: boolean

  // the url to decode and convert to a Path. Defaults to window.location.pathname.
  url?: string
}

/**
 * Resolves the id encoded at a context-view step.
 *
 * `pathToUrl` writes the Lexeme instance there, matching the Path encoding. Urls written before context steps existed
 * wrote the context instead, so an id whose value does not belong to the context view thought's Lexeme is treated as a
 * legacy context and resolved to an instance within it. That fallback is best-effort — a context holding two thoughts
 * of the same Lexeme is not recoverable from a legacy url — but it keeps old links working.
 */
const resolveInstanceId = (state: State, contextViewId: ThoughtId, id: ThoughtId): ThoughtId => {
  const contextViewThought = getThoughtById(state, contextViewId)
  const thought = getThoughtById(state, id)
  if (!contextViewThought || !thought) return id
  if (hashThought(thought.value) === hashThought(contextViewThought.value)) return id
  return getContexts(state, contextViewThought.value).find(cxid => getThoughtById(state, cxid)?.parentId === id) ?? id
}

/** Parses the thoughts from the url. A `~` suffix on a component means the context view is active on it, and therefore that the component after it crosses that context view. */
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

  const ids = urlPath.map(componentToThought) as ThoughtId[]
  const contextViewActive = urlPath.map(component => /~$/.test(component))

  // rebuild the Path, tagging every step that follows a component the context view was active on
  const pathUnranked = ids.reduce<PathStep[]>((accum, id, i) => {
    const previousId = ids[i - 1]
    return [...accum, i > 0 && contextViewActive[i - 1] ? contextStep(resolveInstanceId(state, previousId, id)) : id]
  }, []) as Path

  // state.contextViews is keyed by hashPath, so the key must be built from the reconstructed Path rather than from a
  // bare ThoughtId. Keying it by id silently produced a map that isContextViewActive could never match.
  const contextViews: Index<boolean> = keyValueBy(ids, (id, i) =>
    contextViewActive[i] ? { [hashPath(pathUnranked.slice(0, i + 1) as Path)]: true } : null,
  )

  // validate thoughts and set path to null if any are missing
  const thoughts = childIdsToThoughts(state, pathIds(pathUnranked))
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
