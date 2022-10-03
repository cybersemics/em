import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import State from '../../@types/State'

/** Returns true if the element has more than one line of text. */
const useMultiline = (contentRef: React.RefObject<HTMLElement>, isEditing: boolean, valueThrottled: string) => {
  const [multiline, setMultiline] = useState(false)
  const cursor = useSelector((state: State) => state.cursor)
  const value = useSelector((state: State) => (isEditing ? state.editingValue! : valueThrottled))
  const fontSize = useSelector((state: State) => state.fontSize)

  useEffect(
    () => {
      if (contentRef.current) {
        const height = contentRef.current.clientHeight
        // 1.72 must match line-height as defined in .thought-container
        const singleLineHeight = fontSize * 1.72
        // .editable.multiline gets 5px of padding-top to offset the collapsed line-height
        // we need to account for padding-top, otherwise it can cause a false positive
        const paddingTop = parseInt(window.getComputedStyle(contentRef.current).paddingTop)
        // The element is multiline if its height is twice the single line height.
        // (Actually we just check if it is over 1.5x the single line height for a more forgiving condition.)
        setMultiline(height - paddingTop > singleLineHeight * 1.5)
      }
    },
    /* Subscribe to cursor, even though it is not explicity referenced in the calculation.
       When the cursor changes, and thus the autofocus changes, the width of the editable can change, which can cause it to change from a single to multiline (or vice versa).

       e.g. Move the cursor between C and D on mobile

         - A
          - B
            - C
              - D
                - Money as the universal commodity
                - E
                - F

    */
    [cursor, fontSize, value],
  )

  return multiline
}

export default useMultiline
