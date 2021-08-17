/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useRef, useState } from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

import { commonStyles } from '../style/commonStyles'
import { useDimensions } from '@react-native-community/hooks'
import { createWebHTML, WEBVIEW_POST_EVENTS } from '../util/createWebHTML'

interface ContentEditableProps {
  style?: ViewStyle
  html: string
  disabled?: boolean
  isEditing?: boolean
  forceUpdate?: boolean
  onChange: (e: string) => void
  onFocus: () => void
  onBlur: () => void
  onPaste?: (e: IOnPaste) => void
  onKeyDown?: (e: IKeyDown) => void
  placeholder: string
}

export interface IOnPaste {
  htmlText: string
  plainText: string
  innerHTML: string
}
export interface IKeyDown {
  keyCode: number
  key: string
}

/**
 * Content Editable Component.
 */
const ContentEditable = ({
  style,
  html,
  disabled,
  forceUpdate,
  placeholder,
  isEditing,
  ...props
}: ContentEditableProps) => {
  const allowInnerHTMLChange = useRef<boolean>(true)
  const { width } = useDimensions().window
  const contentRef = useRef<WebView>(null)

  const [webviewHTML, setWebviewHTML] = useState<string>(createWebHTML({ innerHTML: html, placeholder, isEditing }))

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (e: string) => {
    // prevent innerHTML update when editing
    allowInnerHTMLChange.current = false

    props.onChange(e)
  }

  return (
    <View style={commonStyles.flexOne}>
      <WebView
        ref={contentRef}
        originWhitelist={['*']}
        source={{
          html: webviewHTML,
        }}
        hideKeyboardAccessoryView={true}
        domStorageEnabled={false}
        javaScriptEnabled
        onMessage={event => {
          const { eventType, event: webEvent } = JSON.parse(event.nativeEvent.data)

          switch (eventType) {
            case WEBVIEW_POST_EVENTS.onFocus: {
              // @ts-ignore
              window.getSelection = () => contentRef?.current?.injectJavaScript('getSelectionValues()')

              if (props.onFocus) props.onFocus()
              break
            }

            case WEBVIEW_POST_EVENTS.onBlur: {
              setWebviewHTML(createWebHTML({ innerHTML: html, placeholder }))

              if (props.onBlur) props.onBlur()
              break
            }

            case WEBVIEW_POST_EVENTS.onKeyDown: {
              if (props.onKeyDown) props.onKeyDown(webEvent as IKeyDown)
              break
            }

            case WEBVIEW_POST_EVENTS.onPaste: {
              if (props.onPaste) props.onPaste(webEvent as IOnPaste)
              break
            }

            case WEBVIEW_POST_EVENTS.onChange: {
              handleInput(webEvent)
              break
            }

            default:
              break
          }
        }}
        style={styles(width).webview}
      />
    </View>
  )
}

/** Style.  */
const styles = (width = 0) =>
  StyleSheet.create({
    webview: { width: width - 25, height: 25, marginTop: 10, marginHorizontal: 5, backgroundColor: 'transparent' },
  })

export declare type ContentEditableEvent = string

export default ContentEditable
