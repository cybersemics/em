import React, { useRef } from 'react'
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputChangeEventData,
  TextInputFocusEventData,
  TextInputProps,
  ViewStyle,
} from 'react-native'

interface ContentEditableProps extends TextInputProps {
  style: ViewStyle
  html: string
  disabled?: boolean
  innerRef?: React.RefObject<HTMLDivElement>
  isEditing?: boolean
  forceUpdate: boolean
  onChange: (originalEvent: NativeSyntheticEvent<TextInputChangeEventData>) => void
}

/**
 * Content Editable Component.
 */
const ContentEditable = ({ style, html, disabled, innerRef, forceUpdate, ...props }: ContentEditableProps) => {
  const allowInnerHTMLChange = useRef<boolean>(true)

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (originalEvent: NativeSyntheticEvent<TextInputChangeEventData>) => {
    // prevent innerHTML update when editing
    allowInnerHTMLChange.current = false

    const event = Object.assign({}, originalEvent, {
      target: {
        text: originalEvent.nativeEvent.text,
      },
    })

    props.onChange(event)
  }

  return (
    <TextInput
      style={style}
      onBlur={(originalEvent: NativeSyntheticEvent<TextInputFocusEventData>) => {
        allowInnerHTMLChange.current = true

        const event = Object.assign({}, originalEvent, {
          target: {
            value: originalEvent.nativeEvent.text,
          },
        })

        if (props.onBlur) props.onBlur(event)
      }}
      onChange={handleInput}
    />
  )
}

export declare type ContentEditableEvent = React.SyntheticEvent<HTMLInputElement, Event> & {
  target: {
    value: string
  }
}

export default ContentEditable
