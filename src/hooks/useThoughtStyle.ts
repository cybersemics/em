import _ from 'lodash'
import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { GLOBAL_STYLE_ENV } from '../constants'
import getStyle from '../selectors/getStyle'
import getThoughtById from '../selectors/getThoughtById'
import safeRefMerge from '../util/safeRefMerge'

const EMPTY_OBJECT = {}

/** Gets a globally defined style. */
const getGlobalStyle = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.style

/** A hook for the thought style merged from props, self, and env. Avoids re-renders by always returning a stable object reference. */
const useThoughtStyle = ({
  children,
  env,
  styleProp,
  thoughtId,
}: {
  children: Thought[]
  env: LazyEnv | undefined
  styleProp: React.CSSProperties | undefined
  thoughtId: ThoughtId
}) => {
  const style = useSelector(state => {
    const thought = getThoughtById(state, thoughtId)
    if (!thought) return undefined

    // may return null if context ancestors have not yet loaded
    const parent = getThoughtById(state, thought.parentId) as Thought | null

    const styleSelf =
      thought.value !== '=children' && thought.value !== '=grandchildren' && parent?.value !== '=let'
        ? getStyle(state, thought.id)
        : null

    /** Load styles from child expressions that are found in the environment. */
    const styleEnv = children
      .filter(
        child =>
          child.value in GLOBAL_STYLE_ENV ||
          // children that have an entry in the environment
          (child.value in { ...env } &&
            // do not apply to =let itself i.e. =let/x/=style should not apply to =let
            child.id !== env![child.value]),
      )
      .map(child =>
        child.value in { ...env } ? getStyle(state, env![child.value]) : getGlobalStyle(child.value) || {},
      )
      .reduce<React.CSSProperties>(
        (accum, style) => ({
          ...accum,
          ...style,
        }),
        // use stable object reference
        EMPTY_OBJECT,
      )

    // avoid re-renders from object reference change
    return safeRefMerge(styleProp, styleEnv, styleSelf) || undefined
  }, _.isEqual)

  // do not return empty object
  return Object.keys(style || {}).length > 0 ? style : undefined
}

export default useThoughtStyle
