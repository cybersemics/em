import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import LazyEnv from '../@types/LazyEnv'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import rootedParentOf from '../selectors/rootedParentOf'
import { store } from '../store'
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
  const [zoom, setZoom] = useState(false)
  const [zoomCursor, setZoomCursor] = useState(false)
  const [zoomParent, setZoomParent] = useState(false)
  const cursor = useSelector((state: State) => state.cursor)

  useEffect(() => {
    const state = store.getState()

    const parentChildrenAttributeId = cursor && findDescendant(state, head(rootedParentOf(state, cursor)), '=children')
    const grandparentChildrenAttributeId =
      cursor && findDescendant(state, head(rootedParentOf(state, parentOf(cursor))), '=children')

    /*
    When =focus/Zoom is set on the cursor or parent of the cursor, change the autofocus so that it hides the level above.
    1. Force actualDistance to 2 to hide thoughts.
    2. Set zoomCursor and zoomParent CSS classes to handle siblings.
  */
    const zoomCursor =
      !!cursor &&
      (attributeEquals(state, head(cursor), '=focus', 'Zoom') ||
        attributeEquals(state, parentChildrenAttributeId, '=focus', 'Zoom') ||
        !!findFirstEnvContextWithZoom(state, { id: head(cursor), env }))

    const zoomParent =
      !!cursor &&
      (attributeEquals(state, head(rootedParentOf(state, cursor)), '=focus', 'Zoom') ||
        attributeEquals(state, grandparentChildrenAttributeId, '=focus', 'Zoom') ||
        !!findFirstEnvContextWithZoom(state, { id: head(rootedParentOf(state, cursor)), env }))

    const isEditingAncestor = isEditingPath && !isEditing

    /** Returns true if editing a grandchild of the cursor whose parent is zoomed. */
    const zoomParentEditing = () =>
      !!cursor && cursor.length > 2 && zoomParent && equalPath(parentOf(parentOf(cursor)), simplePath) // resolvedPath?

    /** Returns true if the thought is zoomed. */
    const isZoomed = () => isEditingAncestor && (zoomCursor || zoomParentEditing())

    setZoomCursor(zoomCursor)
    setZoomParent(zoomParent)
    setZoom(isZoomed)
  }, [cursor])

  return { zoom, zoomCursor, zoomParent }
}

export default useZoom
