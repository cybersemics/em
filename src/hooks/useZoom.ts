import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import rootedParentOf from '../selectors/rootedParentOf'
import equalPath from '../util/equalPath'
import findFirstEnvContextWithZoom from '../util/findFirstEnvContextWithZoom'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** Calculates the cursor zoom after initial render for better performance. */
const useZoom = ({
  env,
  isEditing,
  isEditingPath,
  simplePath,
}: {
  env: LazyEnv
  isEditing: boolean
  isEditingPath: boolean
  simplePath: SimplePath
}) => {
  /*
    When =focus/Zoom is set on the cursor or parent of the cursor, change the autofocus so that it hides the level above.
    1. Force actualDistance to 2 to hide thoughts.
    2. Set zoomCursor and zoomParent CSS classes to handle siblings.
  */
  const zoomCursor = useSelector(state => {
    const parentChildrenAttributeId =
      state.cursor && findDescendant(state, head(rootedParentOf(state, state.cursor)), '=children')

    return (
      !!state.cursor &&
      (attributeEquals(state, head(state.cursor), '=focus', 'Zoom') ||
        attributeEquals(state, parentChildrenAttributeId, '=focus', 'Zoom') ||
        !!findFirstEnvContextWithZoom(state, { id: head(state.cursor), env }))
    )
  })

  const zoomParent = useSelector(state => {
    const grandparentChildrenAttributeId =
      state.cursor && findDescendant(state, head(rootedParentOf(state, parentOf(state.cursor))), '=children')

    return (
      !!state.cursor &&
      (attributeEquals(state, head(rootedParentOf(state, state.cursor)), '=focus', 'Zoom') ||
        attributeEquals(state, grandparentChildrenAttributeId, '=focus', 'Zoom') ||
        !!findFirstEnvContextWithZoom(state, { id: head(rootedParentOf(state, state.cursor)), env }))
    )
  })

  const zoom = useSelector(state => {
    const isEditingAncestor = isEditingPath && !isEditing

    /** Returns true if editing a grandchild of the cursor whose parent is zoomed. */
    const zoomParentEditing = () =>
      !!state.cursor && state.cursor.length > 2 && zoomParent && equalPath(parentOf(parentOf(state.cursor)), simplePath) // resolvedPath?

    return isEditingAncestor && (zoomCursor || zoomParentEditing())
  })

  return { zoom, zoomCursor, zoomParent }
}

export default useZoom
