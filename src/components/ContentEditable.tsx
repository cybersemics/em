import React, { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

interface ContentEditableProps extends React.HTMLProps<HTMLDivElement> {
  style?: React.CSSProperties
  html: string
  disabled?: boolean
  innerRef?: React.RefObject<HTMLDivElement>
  isEditing?: boolean
  onChange: (originalEvt: ContentEditableEvent) => void
}

/**
 * Content Editable Component.
 */
const ContentEditable = React.memo(({ style, html, disabled, innerRef, ...props }: ContentEditableProps) => {
  const newContentRef = useRef<HTMLDivElement>(null)
  const contentRef = innerRef || newContentRef
  const prevHtmlRef = useRef<string>(html)
  const allowInnerHTMLChange = useRef<boolean>(true)
  const editableNonce = useSelector(state => state.editableNonce)
  const editableNonceRef = useRef<number>(editableNonce)

  useEffect(
    () => {
      if (contentRef.current) {
        contentRef.current.innerHTML = html
      }
    },
    // Only set the html once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(
    () => {
      // prevent innerHTML update when editing
      if (
        editableNonceRef.current !== editableNonce ||
        (prevHtmlRef.current !== html && allowInnerHTMLChange.current)
      ) {
        contentRef.current!.innerHTML = html
        prevHtmlRef.current = html
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [html, editableNonce],
  )

  useEffect(() => {
    editableNonceRef.current = editableNonce
  }, [editableNonce])

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (originalEvent: React.SyntheticEvent<HTMLInputElement>) => {
    const innerHTML = contentRef!.current!.innerHTML

    // prevent innerHTML update when editing
    allowInnerHTMLChange.current = false

    const event = Object.assign({}, originalEvent, {
      target: {
        value: innerHTML,
      },
    })

    props.onChange(event)
  }

  return (
    <div
      {...props}
      onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
        allowInnerHTMLChange.current = true
        if (props.onPaste) props.onPaste(e)
      }}
      ref={contentRef}
      contentEditable={!disabled}
      style={style}
      onBlur={(originalEvent: React.FocusEvent<HTMLInputElement>) => {
        const innerHTML = contentRef!.current!.innerHTML

        // allow innerHTML updates after blur
        allowInnerHTMLChange.current = true

        const event = Object.assign({}, originalEvent, {
          target: {
            value: innerHTML,
          },
        })

        if (props.onBlur) props.onBlur(event)
      }}
      onInput={handleInput}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (props.onKeyDown) props.onKeyDown(e)
      }}
    />
  )
})

ContentEditable.displayName = 'ContentEditable'

export declare type ContentEditableEvent = React.SyntheticEvent<HTMLInputElement, Event> & {
  target: {
    value: string
  }
}

export default ContentEditable
