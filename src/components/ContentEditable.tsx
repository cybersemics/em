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
const ContentEditable = ({ style, html, disabled, innerRef, onChange, ...props }: ContentEditableProps) => {
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

  return <div
    {...props}
    ref={contentRef}
    contentEditable={!disabled}
    style={style}
    onBlur={(originalEvent: React.FocusEvent<any>) => {
      const innerHTML = contentRef!.current!.innerHTML

      const event = Object.assign({}, originalEvent, {
        target: {
          value: innerHTML
        }
      })

      if (props.onBlur) props.onBlur(event)
    }}
    onInput={(originalEvent: React.SyntheticEvent<any>) => {
      const innerHTML = contentRef!.current!.innerHTML

      const event = Object.assign({}, originalEvent, {
        target: {
          value: innerHTML
        }
      })

      onChange(event)
    }}
  />
}

export declare type ContentEditableEvent = React.SyntheticEvent<any, Event> & {
    target: {
        value: string,
    },
};

export default ContentEditable
