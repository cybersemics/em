import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { GLOBAL_STYLE_ENV } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getStyle from '../selectors/getStyle'
import { isDescendantPath } from '../util/isDescendantPath'
import { safeRefMerge } from '../util/safeRefMerge'

const EMPTY_OBJECT = {}

/** A hook for the thought-container style merged from self and zoom. */
const useStyleContainer = ({
  children,
  env,
  styleContainerProp,
  thought,
  path,
}: {
  children: Thought[]
  env: LazyEnv | undefined
  styleContainerProp: React.CSSProperties | undefined
  thought: Thought
  path: Path
}) => {
  const styleContainer = useSelector((state: State) => {
    /** Returns thought-container style from env and self. */
    const styleContainerNew = () => {
      const styleContainerEnv = children
        .filter(
          child =>
            child.value in GLOBAL_STYLE_ENV ||
            // children that have an entry in the environment
            (child.value in { ...env } &&
              // do not apply to =let itself i.e. =let/x/=style should not apply to =let
              child.id !== env![child.value]),
        )
        .map(child => (child.value in { ...env } ? getStyle(state, env![child.value], { container: true }) : {}))
        .reduce<React.CSSProperties>(
          (accum, style) => ({
            ...accum,
            ...style,
          }),
          // use stable object reference
          EMPTY_OBJECT,
        )

      const styleContainerSelf = getStyle(state, thought.id, { container: true })
      return safeRefMerge(styleContainerProp, styleContainerEnv, styleContainerSelf)
    }

    /** Returns thought-container style from zoom. */
    const styleContainerZoom = () => {
      // check if the cursor path includes the current thought
      const isEditingPath = isDescendantPath(state.cursor, path)
      if (!isEditingPath) return null

      const zoomId = findDescendant(state, thought.id, ['=focus', 'Zoom'])
      return getStyle(state, zoomId, { container: true })
    }

    return safeRefMerge(styleContainerNew(), styleContainerZoom()) || undefined
  })

  return styleContainer
}

export default useStyleContainer
