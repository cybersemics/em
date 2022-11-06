import { useCallback, useEffect, useRef, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import editingValueStore from '../../stores/editingValue'
import head from '../../util/head'

/** Invokes a callback when a slice of the state changes without re-rendering the component. Useful when a DOM calculation needs to be performed after a state change, but does not always require a re-render. */
const useSelectorEffect = <T>(
  select: (state: State) => T,
  callback: () => void,
  equalityFn?: (a: T, b: T) => boolean,
) => {
  const prev = useRef<T>(select(store.getState()))
  useEffect(
    () =>
      // Returns unsubscribe which is called on unmount.
      store.subscribe(() => {
        const current = select(store.getState())
        if (equalityFn ? !equalityFn(current, prev.current) : current !== prev.current) {
          // Wait till the next tick, otherwise the callback will be called before components are re-rendered.
          setTimeout(callback)
        }
        prev.current = current
      }),
    [],
  )
}

/** Returns true if the element has more than one line of text. */
const useMultiline = (contentRef: React.RefObject<HTMLElement>, simplePath: SimplePath, isEditing?: boolean) => {
  const [multiline, setMultiline] = useState(false)
  const fontSize = useSelector((state: State) => state.fontSize)

  // re-render when live value changes
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath))?.value)
  editingValueStore.useSelector((editingValue: string | null) => (isEditing ? editingValue : value))

  const updateMultiline = useCallback(() => {
    if (!contentRef.current) return

    const height = contentRef.current.clientHeight
    // 1.72 must match line-height as defined in .thought-container
    const singleLineHeight = fontSize * 1.72
    // .editable.multiline gets 5px of padding-top to offset the collapsed line-height
    // we need to account for padding-top, otherwise it can cause a false positive
    const paddingTop = parseInt(window.getComputedStyle(contentRef.current).paddingTop)
    // The element is multiline if its height is twice the single line height.
    // (Actually we just check if it is over 1.5x the single line height for a more forgiving condition.)
    setMultiline(height - paddingTop > singleLineHeight * 1.5)
  }, [fontSize])

  // subscribe to cursosr change, but only re-render if multiline actually changes
  useSelectorEffect((state: State) => state.cursor?.length, updateMultiline, shallowEqual)
  useEffect(updateMultiline)

  return multiline
}

export default useMultiline
