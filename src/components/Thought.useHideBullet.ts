import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { GLOBAL_STYLE_ENV } from '../constants'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import head from '../util/head'
import isAttribute from '../util/isAttribute'

/** Gets a globally defined bullet. */
const getGlobalBullet = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.bullet

/** Finds the the first env entry with =focus/Zoom. O(children). */
const findFirstEnvContextWithZoom = (state: State, { id, env }: { id: ThoughtId; env: LazyEnv }): ThoughtId | null => {
  const children = getAllChildrenAsThoughts(state, id)
  const child = children.find(
    child => isAttribute(child.value) && attribute(state, env[child.value], '=focus') === 'Zoom',
  )
  return child ? findDescendant(state, env[child.value], ['=focus', 'Zoom']) : null
}

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
