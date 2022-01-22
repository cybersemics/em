import React, { useRef } from 'react'

interface ContentEditableProps extends React.HTMLProps<HTMLDivElement> {
  style: React.CSSProperties
  html: string
  disabled?: boolean
  innerRef?: React.RefObject<HTMLDivElement>
  isEditing?: boolean
  forceUpdate: boolean
  onChange: (originalEvt: ContentEditableEvent) => void
}

/**
 * Content Editable Component.
 */
const ContentEditable = ({
  style,
  html,
  disabled,
  innerRef,
  forceUpdate,
  isEditing,
  ...props
}: ContentEditableProps) => {
  const newContentRef = useRef<HTMLDivElement>(null)
  const contentRef = innerRef || newContentRef
  const prevHtmlRef = useRef<string>(html)
  const prevIsEditing = useRef<boolean | undefined>()
  const allowInnerHTMLChange = useRef<boolean>(true)

  React.useEffect(() => {
    if (contentRef.current) contentRef.current!.innerHTML = html
  }, [])

  React.useEffect(() => {
    // prevent innerHTML update when editing, but allow innerHTML update when isEditing is changed
    if (
      forceUpdate ||
      prevIsEditing.current !== isEditing ||
      (prevHtmlRef.current !== html && allowInnerHTMLChange.current)
    ) {
      prevIsEditing.current = isEditing
      const markdownFormattedHtml = isEditing ? html : formatMarkdown(html)
      contentRef.current!.innerHTML = markdownFormattedHtml
      prevHtmlRef.current = markdownFormattedHtml
    }
  }, [html, forceUpdate, isEditing])

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
}

export declare type ContentEditableEvent = React.SyntheticEvent<HTMLInputElement, Event> & {
  target: {
    value: string
  }
}

/** Replaces markdown features like bold and italics via double asterisks and single asterisks with <b> and <i> tags respectively. */
const formatMarkdown = (value: string) => {
  return value
    .replace(/\*\*(.*)\*\*/g, `<b class="md-bold">$1</b>`)
    .replace(/\*(.*)\*/g, `<i class="md-italics">$1</i>`)
}

export default ContentEditable
