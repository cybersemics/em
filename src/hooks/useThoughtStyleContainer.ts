import _ from 'lodash'
import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { GLOBAL_STYLE_ENV } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import isDescendantPath from '../util/isDescendantPath'
import safeRefMerge from '../util/safeRefMerge'

const EMPTY_OBJECT = {}

/** A hook for the thought-container style merged from self and zoom. Returns a stable object reference. */
const useStyleContainer = ({
  children,
  env,
  styleContainerProp,
  thoughtId,
  path,
}: {
  children: Thought[]
  env: LazyEnv | undefined
  styleContainerProp: React.CSSProperties | undefined
  thoughtId: ThoughtId
  path: Path
}) => {
  const styleContainer = useSelector(state => {
    const thought = getThoughtById(state, thoughtId)

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
        .map(child =>
          child.value in { ...env } ? getStyle(state, env![child.value], { attributeName: '=styleContainer' }) : {},
        )
        .reduce<React.CSSProperties>(
          (accum, style) => ({
            ...accum,
            ...style,
          }),
          // use stable object reference
          EMPTY_OBJECT,
        )

      const styleContainerSelf = getStyle(state, thought.id, { attributeName: '=styleContainer' })
      return safeRefMerge(styleContainerProp, styleContainerEnv, styleContainerSelf)
    }

    /** Returns thought-container style from zoom. */
    const styleContainerZoom = () => {
      // check if the cursor path includes the current thought
      const isEditingPath = isDescendantPath(state.cursor, path)
      if (!isEditingPath) return null

      const zoomId = findDescendant(state, thought.id, ['=focus', 'Zoom'])
      return getStyle(state, zoomId, { attributeName: '=styleContainer' })
    }

    return safeRefMerge(styleContainerNew(), styleContainerZoom()) || undefined
  }, _.isEqual)

  return styleContainer
}

export default useStyleContainer
