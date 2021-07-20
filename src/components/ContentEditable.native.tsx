import React, { useRef } from 'react'
import { ViewStyle } from 'react-native'
import { RichEditor, RichEditorProps, RichToolbar } from 'react-native-pell-rich-editor'
import { commonStyles } from '../style/commonStyles'

interface ContentEditableProps extends RichEditorProps {
  style: ViewStyle
  html: string
  disabled?: boolean
  innerRef?: React.RefObject<HTMLDivElement>
  isEditing?: boolean
  forceUpdate: boolean
  onChange: (e: string) => void
}

/**
 * Content Editable Component.
 */
const ContentEditable = ({ style, html, disabled, innerRef, forceUpdate, ...props }: ContentEditableProps) => {
  const allowInnerHTMLChange = useRef<boolean>(true)
  const contentRef = useRef<RichEditor>(null)

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (e: string) => {
    // prevent innerHTML update when editing
    allowInnerHTMLChange.current = false

    // const event = Object.assign({}, e, {
    //   target: {
    //     text: e,
    //   },
    // })

    props.onChange(e)
  }

  return (
    <>
      <RichEditor
        {...props}
        initialContentHTML={html}
        onPaste={(e: string) => {
          allowInnerHTMLChange.current = true
          if (props.onPaste) props.onPaste(e)
        }}
        ref={contentRef}
        // contentEditable={!disabled}
        style={style}
        // onBlur={(originalEvent: React.FocusEvent<HTMLInputElement>) => {
        //   const innerHTML = contentRef!.current!.innerHTML

        //   // allow innerHTML updates after blur
        //   allowInnerHTMLChange.current = true

        //   const event = Object.assign({}, originalEvent, {
        //     target: {
        //       value: innerHTML,
        //     },
        //   })

        //   if (props.onBlur) props.onBlur(event)
        // }}
        onChange={handleInput}
        onKeyDown={(e: { keyCode: number; key: string }) => {
          if (props.onKeyDown) props.onKeyDown(e)
        }}
      />
      <RichToolbar editor={contentRef} style={commonStyles.zeroHeight} />
    </>
  )
}

export declare type ContentEditableEvent = string

export default ContentEditable
