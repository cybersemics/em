import { PropsWithChildren, RefObject } from 'react'
import { dialogRecipe } from '../../../styled-system/recipes'
import ScrollbarThumb from '../ScrollbarThumb'

/**
 * Content for dialog box. The native scrollbar is hidden in dialogRecipe, and a ScrollbarThumb is drawn over the
 * scrollable region instead, since iOS WebKit cannot recolor its native overflow scrollbar via CSS.
 *
 * `scrollRef` is forwarded onto the scrollable region so the consumer can read/control the scroll
 * position (e.g. the Command Universe resets it to the top when its search results crossfade).
 */
const DialogContent: React.FC<PropsWithChildren<{ scrollRef: RefObject<HTMLDivElement | null> }>> = ({
  children,
  scrollRef,
}) => {
  const dialog = dialogRecipe()

  return (
    <div className={dialog.contentWrapper}>
      <div ref={scrollRef} data-dialog-scroll='true' className={dialog.content}>
        <div className={dialog.contentInner}>{children}</div>
      </div>
      <ScrollbarThumb scrollRef={scrollRef} />
    </div>
  )
}

export default DialogContent
