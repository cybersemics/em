import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { GLOBAL_STYLE_ENV } from '../constants'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import findFirstEnvContextWithZoom from '../util/findFirstEnvContextWithZoom'
import head from '../util/head'

/** Gets a globally defined bullet. */
const getGlobalBullet = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.bullet

/** A hook that returns true if the bullet should be hidden based on the =bullet attribute. */
const useHideBullet = ({
  children,
  env,
  hideBulletProp,
  isEditing,
  simplePath,
  thought,
}: {
  children: Thought[]
  env: LazyEnv | undefined
  hideBulletProp: boolean | undefined
  isEditing: boolean
  simplePath: SimplePath
  thought: Thought
}) => {
  const hideBullet = useSelector((state: State) => {
    // bullet may be set from =children or =grandchildren and passed as a prop
    if (hideBulletProp) return true

    /** Returns true if the bullet should be hidden. */
    const hideBullet = () =>
      thought.value !== '=grandchildren' && attribute(state, head(simplePath), '=bullet') === 'None'

    /** Returns true if the bullet should be hidden if zoomed. */
    const hideBulletZoom = (): boolean => {
      if (!isEditing) return false
      const childEnvZoomId = findFirstEnvContextWithZoom(state, { id: thought.id, env: env || {} })
      const zoomId = findDescendant(state, head(simplePath), ['=focus', 'Zoom'])
      return attribute(state, zoomId, '=bullet') === 'None' || attribute(state, childEnvZoomId, '=bullet') === 'None'
    }

    /** Load =bullet from child expressions that are found in the environment. */
    const hideBulletEnv = () => {
      const bulletEnv = children
        .filter(
          child =>
            child.value in GLOBAL_STYLE_ENV ||
            // children that have an entry in the environment
            (child.value in { ...env } &&
              // do not apply to =let itself i.e. =let/x/=style should not apply to =let
              child.id !== env![child.value]),
        )
        .map(child =>
          child.value in { ...env } ? attribute(state, env![child.value], '=bullet') : getGlobalBullet(child.value),
        )
      return bulletEnv.some(envChildBullet => envChildBullet === 'None')
    }

    return hideBullet() || hideBulletZoom() || hideBulletEnv()
  })

  return hideBullet
}

export default useHideBullet
