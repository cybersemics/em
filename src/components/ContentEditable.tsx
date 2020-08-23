import React, { useRef } from 'react'
import { GenericObject } from '../utilTypes'
import { setSelection } from '../util'

interface ContentEditableProps extends React.HTMLProps<HTMLDivElement>{
    style: GenericObject,
    html: string,
    disabled?: boolean,
    innerRef?: React.RefObject<HTMLDivElement>,
    isEditing?: boolean,
}

/**
 * Content Editable Component.
 */
const ContentEditable = ({ style, html, disabled, innerRef, isEditing, ...props }: ContentEditableProps) => {
  const contentRef = innerRef || useRef<HTMLDivElement>(null)
  const prevHtmlRef = useRef<string>(html)
  const allowInnerHTMLChange = useRef<boolean>(true)

  React.useEffect(() => {
    if (contentRef.current) contentRef.current!.innerHTML = html
  }, [])

  React.useEffect(() => {
    // prevent innerHTML update when editing
    if (prevHtmlRef.current !== html && allowInnerHTMLChange.current) {
      contentRef.current!.innerHTML = html
      prevHtmlRef.current = html

      if (isEditing && contentRef.current) {
        setSelection(contentRef.current, { end: true })
      }
    }
  }, [html])

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (originalEvent: React.SyntheticEvent<HTMLInputElement>) => {
    const innerHTML = contentRef!.current!.innerHTML

    // prevent innerHTML update when editing
    allowInnerHTMLChange.current = false

    const event = Object.assign({}, originalEvent, {
      target: {
        value: innerHTML
      }
    })

    if (props.onChange) props.onChange(event)
  }

  return <div
    {...props}
    onPaste={
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        allowInnerHTMLChange.current = true
        if (props.onPaste) props.onPaste(e)
      }
    }
    ref={contentRef}
    contentEditable={!disabled}
    style={style}
    onBlur={(originalEvent: React.FocusEvent<HTMLInputElement>) => {
      const innerHTML = contentRef!.current!.innerHTML

      // allow innerHTML updates after blur
      allowInnerHTMLChange.current = true

      const event = Object.assign({}, originalEvent, {
        target: {
          value: innerHTML
        }
      })

      if (props.onBlur) props.onBlur(event)
    }}
    onInput={handleInput}
    onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
      // allow innerHTML update when thought split is triggered
      if (e.key === 'Enter') allowInnerHTMLChange.current = true
      if (props.onKeyDown) props.onKeyDown(e)
    }}
  />
}

export declare type ContentEditableEvent = React.SyntheticEvent<HTMLInputElement, Event> & {
  target: {
    value: string,
  },
}

export default ContentEditable
