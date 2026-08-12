import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { isAndroidWebView, isTouch } from '../browser'
import deferredHtml from '../device/deferredHtml'
import * as selection from '../device/selection'
import globals from '../globals'

interface ContentEditableProps extends Omit<React.HTMLProps<HTMLDivElement>, 'onChange'> {
  style?: React.CSSProperties
  html: string
  disabled?: boolean
  innerRef?: React.RefObject<HTMLDivElement | null>
  onChange: (originalEvt: ContentEditableEvent) => void
  /** Stops the dragover event from propagating to ancestors on desktop. By default, dragover events are allowed and bubble up to ancestors where
   * they may affect other drag-and-drop behavior (e.g. react-dnd). Stopping dragover events may be useful to allow native browser behavior such
   * as text selection drag-and-drop if react-dnd would otherwise interfere. Setting this to true will also prevent the default drop events on mobile. */
  stopDragOver?: boolean
}

/**
 * Content Editable Component.
 */
const ContentEditable = React.memo(
  ({ style, html, disabled, innerRef, onChange, stopDragOver, ...props }: ContentEditableProps) => {
    const newContentRef = useRef<HTMLDivElement>(null)
    const contentRef = innerRef || newContentRef
    const prevHtmlRef = useRef<string>(html)
    const allowInnerHTMLChange = useRef<boolean>(true)
    const pendingHtmlRef = useRef<string | null>(null)
    const editableNonce = useSelector(state => state.editableNonce)
    const editableNonceRef = useRef<number>(editableNonce)

    /** Applies HTML immediately, unless an Android native range must retain ownership of the live DOM. */
    const applyOrDeferHtml = useCallback(
      (nextHtml: string) => {
        const editable = contentRef.current
        if (!editable) return
        const range = selection.offsetRange(editable)
        if (isAndroidWebView() && range && range.start !== range.end) {
          pendingHtmlRef.current = nextHtml
          deferredHtml.mark(editable)
          return
        }
        pendingHtmlRef.current = null
        deferredHtml.clear(editable)
        if (editable.innerHTML !== nextHtml) editable.innerHTML = nextHtml
      },
      [contentRef],
    )

    /** Flushes deferred HTML, optionally restoring the logical range after replacing the editable's DOM. */
    const flushPendingHtml = useCallback(
      ({ preserveSelection = false }: { preserveSelection?: boolean } = {}) => {
        const editable = contentRef.current
        const pendingHtml = pendingHtmlRef.current
        if (!editable || pendingHtml === null) return
        const range = preserveSelection ? selection.offsetRange(editable) : null

        // Clear first because assigning innerHTML may synchronously emit selectionchange.
        pendingHtmlRef.current = null
        deferredHtml.clear(editable)
        if (editable.innerHTML !== pendingHtml) editable.innerHTML = pendingHtml
        if (range) selection.setRange(editable, range.start, range.end)
      },
      [contentRef],
    )

    /** Cancels reconciliation when browser input supersedes the pending formatting-only DOM write. */
    const cancelPendingHtml = useCallback(() => {
      pendingHtmlRef.current = null
      if (contentRef.current) deferredHtml.clear(contentRef.current)
    }, [contentRef])

    useEffect(
      () => {
        if (contentRef.current) {
          applyOrDeferHtml(html)
          prevHtmlRef.current = html
        }
      },
      // Only set the html once on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    )

    useEffect(
      () => {
        const editable = contentRef.current
        const range = editable ? selection.offsetRange(editable) : null
        // Android partial colors mark deferredHtml before React re-renders. Always reconcile those updates even when
        // allowInnerHTMLChange is false, including the case where the native range collapses before this effect runs —
        // otherwise prevHtmlRef advances and the canonical value is never written.
        const shouldReconcileDeferred = !!editable && deferredHtml.has(editable)
        const preserveAndroidRange = isAndroidWebView() && !!range && range.start !== range.end
        // prevent innerHTML update when editing
        if (
          editableNonceRef.current !== editableNonce ||
          (prevHtmlRef.current !== html &&
            (allowInnerHTMLChange.current || preserveAndroidRange || shouldReconcileDeferred))
        ) {
          applyOrDeferHtml(html)
        }
        prevHtmlRef.current = html
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [html, editableNonce],
    )

    useEffect(() => {
      editableNonceRef.current = editableNonce
    }, [editableNonce])

    useEffect(() => {
      /** Applies a pending value after Android's native range collapses or leaves this editable. */
      const onSelectionChange = () => {
        if (pendingHtmlRef.current === null || !contentRef.current) return
        const range = selection.offsetRange(contentRef.current)
        if (!range || range.start === range.end) flushPendingHtml({ preserveSelection: !!range })
      }

      document.addEventListener('selectionchange', onSelectionChange)
      return () => document.removeEventListener('selectionchange', onSelectionChange)
    }, [contentRef, flushPendingHtml])

    // eslint-disable-next-line jsdoc/require-jsdoc
    const handleInput = (originalEvent: React.SyntheticEvent<HTMLDivElement>) => {
      // Browser input supersedes a pending formatting-only DOM write.
      cancelPendingHtml()
      const innerHTML = contentRef!.current!.innerHTML

      // prevent innerHTML update when editing
      allowInnerHTMLChange.current = false

      const event = Object.assign({}, originalEvent, {
        target: {
          value: innerHTML,
        },
      })

      onChange(event)
    }

    return (
      <div
        {...props}
        onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
          allowInnerHTMLChange.current = true
          if (props.onPaste) props.onPaste(e)
        }}
        onBeforeInput={(e: React.InputEvent<HTMLDivElement>) => {
          cancelPendingHtml()
          if (props.onBeforeInput) props.onBeforeInput(e)
        }}
        onCompositionStart={(e: React.CompositionEvent<HTMLDivElement>) => {
          cancelPendingHtml()
          if (props.onCompositionStart) props.onCompositionStart(e)
        }}
        onCopy={(e: React.ClipboardEvent<HTMLDivElement>) => {
          flushPendingHtml({ preserveSelection: true })
          if (props.onCopy) props.onCopy(e)
        }}
        onCut={(e: React.ClipboardEvent<HTMLDivElement>) => {
          flushPendingHtml({ preserveSelection: true })
          if (props.onCut) props.onCut(e)
        }}
        ref={contentRef}
        contentEditable={!disabled}
        // capitalize the first letter of each sentence to match the native on-screen keyboard behavior (e.g. iOS auto-capitalizes by default, but Android does not unless autocapitalize is set) (#3531)
        autoCapitalize='sentences'
        // disable spellCheck when running in Puppeteer, otherwise red squiggly lines can break the snapshot tests
        spellCheck={!navigator.webdriver}
        style={style}
        onBlur={(originalEvent: React.FocusEvent<HTMLDivElement>) => {
          flushPendingHtml()
          const innerHTML = contentRef!.current!.innerHTML

          // allow innerHTML updates after blur
          // The momentary blur of the iOS autocomplete focus retarget does not end editing — focus returns to the
          // editable immediately — so keep innerHTML updates suppressed there, or a re-render can overwrite what the
          // user is typing with the trimmed value from Redux (#4828).
          if (!globals.suppressBlurSync) {
            allowInnerHTMLChange.current = true
          }

          const event = Object.assign({}, originalEvent, {
            target: {
              value: innerHTML,
            },
          })

          if (props.onBlur) props.onBlur(event)
        }}
        // Allow dragging a text selection within an editable (#3530)
        // https://github.com/react-dnd/react-dnd/issues/3157
        onDragOver={isTouch || disabled || stopDragOver ? undefined : e => e.stopPropagation()}
        onDrop={isTouch && stopDragOver ? e => e.preventDefault() : undefined}
        onInput={handleInput}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (props.onKeyDown) props.onKeyDown(e)
        }}
      />
    )
  },
)

ContentEditable.displayName = 'ContentEditable'

export declare type ContentEditableEvent = React.SyntheticEvent<HTMLDivElement, Event> & {
  target: {
    value: string
  }
}

export default ContentEditable
