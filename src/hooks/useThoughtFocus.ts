import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import { moveThoughtActionCreator as moveThought } from '../actions/moveThought'

/**
 * Dispatch moveThought when this thought lost focus.
 * This resorts the edited thought in thought list when cursor changes.
 * */
const useThoughtFocus = (isEditing: boolean, path: SimplePath, rank: number, value?: string) => {
  const dispatch = useDispatch()
  const prevEditingRef = useRef(isEditing)
  const prevValueRef = useRef(value)

  useEffect(() => {
    // Skip if this thought is still isEditing is true or value is not changed even though isEditing is false
    const isFocusLostAndUpdated = !isEditing && isEditing !== prevEditingRef.current && prevValueRef.current !== value
    if (isFocusLostAndUpdated) {
      dispatch(moveThought({ oldPath: path, newPath: path, newRank: rank, skipRerank: true }))
    }

    if (!isEditing) prevValueRef.current = value

    return () => {
      prevEditingRef.current = isEditing
    }
  }, [isEditing, path, rank, dispatch, value])
}

export default useThoughtFocus
