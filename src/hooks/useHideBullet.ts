import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { GLOBAL_STYLE_ENV } from '../constants'
import attribute from '../selectors/attribute'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import equalPath from '../util/equalPath'
import findFirstEnvContextWithZoom from '../util/findFirstEnvContextWithZoom'
import head from '../util/head'

/** Gets a globally defined bullet. */
const getGlobalBullet = (key: string) => GLOBAL_STYLE_ENV[key as keyof typeof GLOBAL_STYLE_ENV]?.bullet

/** A hook that returns true if the bullet should be hidden based on the =bullet attribute and table view. */
const useHideBullet = ({
  children,
  env,
  hideBulletProp,
  isEditing,
  simplePath,
  thoughtId,
}: {
  children: Thought[]
  env: LazyEnv | undefined
  hideBulletProp: boolean | undefined
  isEditing: boolean
  simplePath: SimplePath
  thoughtId: ThoughtId
}) => {
  const hideBullet = useSelector(state => {
    const thought = getThoughtById(state, thoughtId)
    // bullet may be set from =children or =grandchildren and passed as a prop
    if (hideBulletProp) return true

    /** Returns true if the bullet should be hidden. */
    const hideBullet = () =>
      thought.value !== '=grandchildren' && attributeEquals(state, head(simplePath), '=bullet', 'None')

    /** Returns true if the bullet should be hidden because it is in table column 1 and is not the cursor. */
    const hideBulletTable = () =>
      !equalPath(simplePath, state.cursor) &&
      attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table')

    /** Returns true if the bullet should be hidden if zoomed. */
    const hideBulletZoom = (): boolean => {
      if (!isEditing) return false
      const childEnvZoomId = findFirstEnvContextWithZoom(state, { id: thought.id, env: env || {} })
      const zoomId = findDescendant(state, head(simplePath), ['=focus', 'Zoom'])
      return (
        attributeEquals(state, zoomId, '=bullet', 'None') || attributeEquals(state, childEnvZoomId, '=bullet', 'None')
      )
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

    return hideBullet() || hideBulletTable() || hideBulletZoom() || hideBulletEnv()
  })

  return hideBullet
}

export default useHideBullet
