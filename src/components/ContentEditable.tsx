import React, { useRef } from 'react'
import { GenericObject } from '../utilTypes'

interface ContentEditableProps extends React.HTMLProps<HTMLDivElement>{
    style: GenericObject,
    html: string,
    disabled?: boolean,
    innerRef?: React.RefObject<HTMLDivElement>,
    onChange: (originalEvt: ContentEditableEvent) => void,
}

/**
 * Content Editable Component.
 */
const ContentEditable = ({ style, html, disabled, innerRef, ...props }: ContentEditableProps) => {
  const contentRef = innerRef || useRef<HTMLDivElement>(null)
  const prevHtmlRef = useRef<string>(html)

  React.useEffect(() => {
    if (contentRef.current) contentRef.current!.innerHTML = html
  }, [])

  React.useEffect(() => {
    // set innerHTML only when the content editable is not focused
    if (document.activeElement !== contentRef.current && prevHtmlRef.current !== html) {
      contentRef.current!.innerHTML = html
      prevHtmlRef.current = html
    }
  }, [html])

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (originalEvent: React.SyntheticEvent<HTMLInputElement>) => {
    const innerHTML = contentRef!.current!.innerHTML

    const event = Object.assign({}, originalEvent, {
      target: {
        value: innerHTML
      }
    })

    props.onChange(event)
  }

  return <div
    {...props}
    ref={contentRef}
    contentEditable={!disabled}
    style={style}
    onBlur={(originalEvent: React.FocusEvent<HTMLInputElement>) => {
      const innerHTML = contentRef!.current!.innerHTML

      const event = Object.assign({}, originalEvent, {
        target: {
          value: innerHTML
        }
      })

      if (props.onBlur) props.onBlur(event)
    }}
    onInput={handleInput}
  />
}

export declare type ContentEditableEvent = React.SyntheticEvent<HTMLInputElement, Event> & {
  target: {
    value: string,
  },
}

export default ContentEditable
