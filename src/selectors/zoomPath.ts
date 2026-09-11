import moize from 'moize'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import head from '../util/head'
import parseLet from '../util/parseLet'
import attributeEquals from './attributeEquals'
import findDescendant from './findDescendant'
import findFirstEnvContextWithZoom from './findFirstEnvContextWithZoom'
import rootedParentOf from './rootedParentOf'

const EMPTY_ENV: LazyEnv = {}

/** Returns true if =focus/Zoom applies to the thought at the given path, whether set on the thought itself, on all of its siblings via its parent's =children, or through a =let binding named by one of its children. */
const isZoomed = (state: State, path: Path, env: LazyEnv): boolean =>
  attributeEquals(state, head(path), '=focus', 'Zoom') ||
  attributeEquals(state, findDescendant(state, head(rootedParentOf(state, path)), '=children'), '=focus', 'Zoom') ||
  !!findFirstEnvContextWithZoom(state, { id: head(path), env })

/** Returns the deepest ancestor-or-self of the cursor that =focus/Zoom applies to, or null if the cursor is not zoomed. Every thought outside the returned path's subtree is hidden by calculateAutofocus.
 *
 * Memoized on the whole state rather than on narrower slices the way getSetting is, since calculateAutofocus calls this once per visible thought and the point is to collapse those into one walk per render. Keying on the state object achieves that without having to enumerate every slice the walk reads (thoughtIndex, cursor, rootContext); the cost is only that an unrelated state change re-walks. */
const zoomPath = moize(
  (state: State): Path | null => {
    if (!state.cursor) return null

    let env: LazyEnv = EMPTY_ENV
    let zoom: Path | null = null

    // Walk down from the root so that the =let env accumulates the way it does in linearizeTree, and keep the last match rather than returning early so that the innermost zoom wins when zooms are nested.
    for (let i = 1; i <= state.cursor.length; i++) {
      // Add the parent's =let bindings before testing the thought. A thought's own =let is only in scope for its descendants, and a nearer definition shadows an outer one that binds the same name.
      const envParsed = parseLet(state, i === 1 ? HOME_PATH : (state.cursor.slice(0, i - 1) as Path))
      if (Object.keys(envParsed).length > 0) env = { ...env, ...envParsed }

      const path = state.cursor.slice(0, i) as Path
      if (isZoomed(state, path, env)) zoom = path
    }

    return zoom
  },
  { maxSize: 1, profileName: 'zoomPath' },
)

export default zoomPath
