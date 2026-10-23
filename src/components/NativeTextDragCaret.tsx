import { useEffect, useState } from 'react'
import { useDispatch, useStore } from 'react-redux'
import { css } from '../../styled-system/css'
import ThoughtId from '../@types/ThoughtId'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isAndroid } from '../browser'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
import thoughtToPath from '../selectors/thoughtToPath'
import stripEmptyFormattingTags from '../util/stripEmptyFormattingTags'

/** How far above the finger, in px, to draw the drop caret of a native text drag on Android, so that it is not hidden under the finger. See onAndroidDragOver. */
const NATIVE_TEXT_DRAG_CARET_OFFSET = 40

/**
 * Handles a native drag of selected text on Android: dismisses the selection menu, replaces the drag image, and moves
 * the text to a drop caret drawn above the finger. Returns the position of the drop caret, in viewport coordinates, or
 * null when no drop point is targeted. See #4225.
 */
const useNativeTextDrag = () => {
  const store = useStore()
  const dispatch = useDispatch()
  const [caret, setCaret] = useState<{ x: number; y: number; height: number } | null>(null)

  useEffect(() => {
    if (!isAndroid) return

    /** The thought, its editable, and the plain-text offsets of the selected text being dragged natively on Android, or null if no native text drag is in progress. See #4225. */
    let nativeTextDrag: { id: ThoughtId; editable: HTMLElement; start: number; end: number } | null = null

    /** The selected range when the last touch began, or null if the selection was collapsed. See onAndroidContextMenu. */
    let pressedSelection: selection.SavedRange | null = null

    /**
     * Returns the thought editable that contains the node, and the id of its thought, or null if the node is not in a
     * thought. A thought that the Editable change handler would not let the user edit — one marked =readonly or
     * =uneditable, or restricted to =options — is marked uneditable, so that dragged text is neither taken out of it nor
     * dropped into it.
     */
    const thoughtEditableAt = (node: Node | null | undefined) => {
      const editable = (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-editable]')
      const id = editable?.getAttribute('aria-label')?.replace(/^editable-/, '') as ThoughtId | undefined
      const state = store.getState()
      const thought = id && getThoughtById(state, id)
      if (!editable || !thought) return null

      const uneditable =
        !!findDescendant(state, thought.id, '=readonly') ||
        !!findDescendant(state, thought.id, '=uneditable') ||
        !!findDescendant(state, thought.parentId, '=options')
      return { id: thought.id, editable, uneditable }
    }

    /**
     * Finds where dragged text would be dropped on Android for a finger at the given viewport coordinates.
     * The drop point is NATIVE_TEXT_DRAG_CARET_OFFSET above the finger, so the drop caret is not hidden under it.
     * Returns the thought, its editable, the plain-text offset within it, and the caret's rect, or null if the point is
     * not in a thought that can be edited.
     */
    const nativeTextDropPoint = (x: number, y: number) => {
      const range = document.caretRangeFromPoint(x, y - NATIVE_TEXT_DRAG_CARET_OFFSET)
      const target = thoughtEditableAt(range?.startContainer)
      if (!range || !target || target.uneditable) return null

      const before = document.createRange()
      before.setStart(target.editable, 0)
      before.setEnd(range.startContainer, range.startOffset)
      return { ...target, offset: before.toString().length, rect: range.getBoundingClientRect() }
    }

    /** Ends a native text drag on Android, hiding the drop caret. */
    const endNativeTextDrag = () => {
      nativeTextDrag = null
      setCaret(null)
      delete document.body.dataset.nativeTextDrag
    }

    /**
     * Starts a native text drag on Android. A long press on selected text starts a native drag, but the Android
     * WebView leaves the selection menu (Cut, Copy, …) on screen over the dragged text for the whole drag. The menu is
     * drawn for the selected range, so collapsing the selection dismisses it without blurring the editable. The collapse
     * is deferred because the browser takes the drag image (the text that follows the finger) after dragstart. The
     * dragged text is saved as offsets so the drop can move it, and the body is flagged to hide the native caret for the
     * duration of the drag. Text cannot be dragged out of a thought that cannot be edited. Thought drags are unaffected:
     * react-dnd's TouchBackend does not use native drag events.
     */
    const onAndroidDragStart = (e: DragEvent) => {
      const source = thoughtEditableAt(e.target as Node | null)
      const text = selection.text()
      const offsets = source && text ? selection.offsetRange(source.editable) : null
      if (!source || !text || !offsets) return
      if (source.uneditable) {
        e.preventDefault()
        return
      }

      const { id, editable } = source
      nativeTextDrag = { id, editable, ...offsets }
      document.body.dataset.nativeTextDrag = 'true'

      // The default drag image of selected text is only its glyphs, with no background, and Android draws a text drag
      // translucent, so the dragged text is too faint to see over the text behind it. Replace it with the text on an
      // opaque background. The image is painted from the element after dragstart, so the element must be laid out
      // (offscreen rather than display: none) and is removed afterwards. The offset keeps the image where the selected
      // text was relative to the finger, as the default image does.
      const rect = selection.getBoundingClientRect()
      if (e.dataTransfer && rect) {
        const image = document.createElement('div')
        image.className = css({
          position: 'fixed',
          top: '-1000px',
          left: 0,
          padding: '2px 4px',
          border: 'solid 1px {colors.fg}',
          borderRadius: '4px',
          backgroundColor: 'bg',
          color: 'fg',
          whiteSpace: 'pre-wrap',
        })
        image.style.font = getComputedStyle(editable).font
        image.style.maxWidth = `${editable.clientWidth}px`
        image.textContent = text
        document.body.appendChild(image)
        // include the 1px border and the padding
        e.dataTransfer.setDragImage(image, e.clientX - rect.left + 5, e.clientY - rect.top + 3)
        setTimeout(() => image.remove())
      }

      setTimeout(selection.collapse)
    }

    /**
     * Suppresses em's long-press handling of the context menu while selected text is pressed on Android. A long
     * press on selected text never becomes a thought drag (see canDrag), but the long-press handler in useLongPress
     * still blurs the editable and closes the keyboard, which interrupts the native text drag. The context menu that
     * follows the long press may arrive just before or just after dragstart, so a selection that is unchanged since the
     * touch began is checked too. A long press on text that is not selected selects the word under the finger before the
     * context menu arrives, and that selection is left to useLongPress to clear, so the press can become a thought drag
     * (#5976). Registered in the capture phase so it runs before React's handlers.
     */
    const onAndroidContextMenu = (e: MouseEvent) => {
      if ((e as PointerEvent).pointerType !== 'touch') return
      const current = selection.saveRange()
      const pressedOnSelection =
        !!pressedSelection &&
        !!current &&
        current.anchorNode === pressedSelection.anchorNode &&
        current.anchorOffset === pressedSelection.anchorOffset &&
        current.focusNode === pressedSelection.focusNode &&
        current.focusOffset === pressedSelection.focusOffset
      if (!nativeTextDrag && !pressedOnSelection) return
      e.preventDefault()
      e.stopPropagation()
    }

    /**
     * Moves the drop caret of a native text drag on Android. The browser draws its own drop caret under the
     * finger, where it cannot be seen, while the collapsed selection's caret stays at the dragged text, so there are two.
     * Canceling dragover clears the browser's drop caret, and the native caret is hidden while dragging, which leaves
     * the single drop caret rendered by NativeTextDragCaret above the finger. Registered in the capture phase, since
     * ContentEditable stops dragover from propagating when the device does not have a coarse pointer.
     */
    const onAndroidDragOver = (e: DragEvent) => {
      if (!nativeTextDrag) return
      e.preventDefault()
      const target = nativeTextDropPoint(e.clientX, e.clientY)
      if (e.dataTransfer) e.dataTransfer.dropEffect = target ? 'move' : 'none'
      setCaret(
        target && target.rect.height > 0
          ? { x: target.rect.left, y: target.rect.top, height: target.rect.height }
          : null,
      )
    }

    /**
     * Moves the dragged text to the drop caret on Android. The drop is canceled, since the browser would drop the text
     * under the finger rather than at the drop caret above it, and would edit the editables behind em's back. Instead
     * the dragged text, with the formatting it is in, is cut out of the source thought's value and inserted into the
     * target thought's value, and the new values are dispatched as edits. The dragged text is reselected if it is
     * dropped onto itself, or anywhere it cannot be dropped. Registered in the capture phase so it runs before any other
     * drop handler.
     */
    const onAndroidDrop = (e: DragEvent) => {
      if (!nativeTextDrag) return
      e.preventDefault()
      const source = nativeTextDrag
      endNativeTextDrag()
      if (!source.editable.isConnected) return

      const target = nativeTextDropPoint(e.clientX, e.clientY)
      const isSameThought = target?.id === source.id
      if (!target || (isSameThought && target.offset >= source.start && target.offset <= source.end)) {
        selection.setRange(source.editable, source)
        return
      }

      dispatch((dispatch, getState) => {
        const state = getState()
        const sourceThought = getThoughtById(state, source.id)
        const targetThought = getThoughtById(state, target.id)
        if (!sourceThought || !targetThought) return

        // Edit detached copies of the values. The partially selected formatting elements are split by extractContents,
        // so the dragged text keeps its formatting, as with a native drop.
        const sourceCopy = document.createElement('div')
        sourceCopy.innerHTML = sourceThought.value
        const targetCopy = isSameThought ? sourceCopy : document.createElement('div')
        if (!isSameThought) targetCopy.innerHTML = targetThought.value

        const startRange = selection.collapsedRangeAtOffset(sourceCopy, source.start)
        const endRange = selection.collapsedRangeAtOffset(sourceCopy, source.end)
        if (!startRange || !endRange) return
        startRange.setEnd(endRange.startContainer, endRange.startOffset)
        const dragged = startRange.extractContents()

        // the text after the dragged text shifts back by its length once it is cut out
        const offset =
          isSameThought && target.offset > source.end ? target.offset - (source.end - source.start) : target.offset
        const insertRange = selection.collapsedRangeAtOffset(targetCopy, offset)
        if (!insertRange) return
        insertRange.insertNode(dragged)

        const sourceValue = stripEmptyFormattingTags(sourceCopy.innerHTML)
        const targetValue = stripEmptyFormattingTags(targetCopy.innerHTML)
        const cursorOffset = offset + (source.end - source.start)

        // Write the new values to the live editables before the edits re-render them, as formatSelection does, since
        // ContentEditable does not replace the contents of an editable while it is being edited.
        source.editable.innerHTML = sourceValue
        target.editable.innerHTML = targetValue

        dispatch([
          // The deletion from the source and the insertion into the target are edits in opposite directions, which
          // are not merged on their own, so the source edit is flagged to merge the move into a single undo step.
          isSameThought
            ? null
            : {
                type: 'editThought',
                oldValue: sourceThought.value,
                newValue: sourceValue,
                path: thoughtToPath(state, source.id),
                mergeNext: true,
              },
          editThought({
            oldValue: targetThought.value,
            newValue: targetValue,
            path: thoughtToPath(state, target.id),
            cursorOffset,
          }),
          isSameThought ? null : setCursor({ path: thoughtToPath(state, target.id), offset: cursorOffset }),
        ])

        selection.set(target.editable, { offset: cursorOffset })
      })
    }

    /**
     * Ends a native text drag on Android whose drop and dragend never arrived, e.g. when the browser drops the drag, so
     * the native caret is not left hidden. A native drag holds the touch, so the next touchstart comes after it has
     * ended. Also saves the selected range the touch began on, for onAndroidContextMenu.
     */
    const onAndroidTouchStart = () => {
      if (nativeTextDrag) endNativeTextDrag()
      pressedSelection = selection.isCollapsed() ? null : selection.saveRange()
    }

    /** Ends a native text drag on Android that was abandoned without a drop, reselecting the dragged text. */
    const onAndroidDragEnd = () => {
      if (!nativeTextDrag) return
      const { editable, start, end } = nativeTextDrag
      endNativeTextDrag()
      if (editable.isConnected) selection.setRange(editable, { start, end })
    }

    window.addEventListener('dragstart', onAndroidDragStart)
    window.addEventListener('contextmenu', onAndroidContextMenu, { capture: true })
    window.addEventListener('dragover', onAndroidDragOver, { capture: true })
    window.addEventListener('drop', onAndroidDrop, { capture: true })
    window.addEventListener('dragend', onAndroidDragEnd)
    window.addEventListener('touchstart', onAndroidTouchStart)
    return () => {
      window.removeEventListener('dragstart', onAndroidDragStart)
      window.removeEventListener('contextmenu', onAndroidContextMenu, { capture: true })
      window.removeEventListener('dragover', onAndroidDragOver, { capture: true })
      window.removeEventListener('drop', onAndroidDrop, { capture: true })
      window.removeEventListener('dragend', onAndroidDragEnd)
      window.removeEventListener('touchstart', onAndroidTouchStart)
    }
  }, [dispatch, store])

  return caret
}

/** The drop caret of a native text drag on Android. It replaces the browser's own drop caret, which is drawn under the finger where it cannot be seen, with one drawn above it. See useNativeTextDrag. */
const NativeTextDragCaret = () => {
  const caret = useNativeTextDrag()
  if (!caret) return null
  return (
    <div
      className={css({
        position: 'fixed',
        width: '2px',
        backgroundColor: 'caret',
        pointerEvents: 'none',
        zIndex: 'popup',
      })}
      style={{ left: caret.x, top: caret.y, height: caret.height }}
      data-testid='native-text-drag-caret'
    />
  )
}

export default NativeTextDragCaret
