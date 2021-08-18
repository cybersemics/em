import React, { useRef } from 'react'
import { ViewStyle } from 'react-native'
import { RichEditor, RichEditorProps, RichToolbar } from 'react-native-pell-rich-editor'

import { commonStyles } from '../style/commonStyles'

interface ContentEditableProps extends RichEditorProps {
  style?: ViewStyle
  html: string
  disabled?: boolean
  isEditing?: boolean
  forceUpdate?: boolean
  onChange: (e: string) => void
}
export interface IKeyDown {
  keyCode: number
  key: string
}

/**
 * Content Editable Component.
 */
const ContentEditable = ({ style, html, disabled, forceUpdate, ...props }: ContentEditableProps) => {
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
        style={style}
        containerStyle={commonStyles.paddingTop}
        editorStyle={editorStyle}
        onBlur={() => {
          if (props.onBlur) props.onBlur()
        }}
        onChange={handleInput}
        onKeyDown={(e: { keyCode: number; key: string }) => {
          if (props.onKeyDown) props.onKeyDown(e)
        }}
      />
      <RichToolbar editor={contentRef} style={commonStyles.zeroHeight} />
    </>
  )
}

const editorStyle = { backgroundColor: 'black', color: 'white', caretColor: 'white' }

export declare type ContentEditableEvent = string

export default ContentEditable
