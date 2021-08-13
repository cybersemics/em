/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useRef } from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

import { commonStyles } from '../style/commonStyles'
import { useDimensions } from '@react-native-community/hooks'

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

enum WEBVIEW_POST_EVENTS {
  onBlur,
  onKeyDown,
  onChange,
  onPaste,
  onFocus,
  onCopy,
}
/**
 * Content Editable Component.
 */
const ContentEditable = ({ style, html, disabled, forceUpdate, ...props }: ContentEditableProps) => {
  const allowInnerHTMLChange = useRef<boolean>(true)
  const { width } = useDimensions().window
  const contentRef = useRef<WebView>(null)

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (e: string) => {
    // prevent innerHTML update when editing
    allowInnerHTMLChange.current = false

    props.onChange(e)
  }

  const _html = `
  <html>
  <head>
    <style>
      * {
        margin: 0;
      }

      #content:empty:before {
        content: attr(placeholder);
      }

      #content {
        font-size: 55px;
        font-family: Arial;
        background-color: #000;
        color: #fff;
        width: 100%;
        height: 100%;
        outline: none;
      }
    </style>
  </head>
  <script>
    function getSelectionValues() {
      const { anchorNode, focusNode, anchorOffset, focusOffset } = getSelection();

      window.ReactNativeWebView.postMessage(JSON.stringify({ anchorNode, focusNode, anchorOffset, focusOffset }))
    }

    document.addEventListener("DOMContentLoaded", function () {
      const ele = document.getElementById("content");

      // Get the placeholder attribute
      const placeholder = ele.getAttribute("placeholder");

      // Set the placeholder as initial content if it's empty
      ele.innerHTML.trim() === "" && (ele.innerHTML = placeholder);

      ele.addEventListener("focus", function (e) {
        const value = e.target.innerHTML;
        value === placeholder && (e.target.innerHTML = "");

        window.ReactNativeWebView.postMessage(JSON.stringify({ event: e, eventType: ${WEBVIEW_POST_EVENTS.onFocus} }))
      });

      ele.addEventListener("blur", function (e) {
        const value = e.target.innerHTML.trim();
        value === "" && (e.target.innerHTML = placeholder);

        window.ReactNativeWebView.postMessage(JSON.stringify({ event: e, text: value, eventType: ${WEBVIEW_POST_EVENTS.onBlur} }))
      });

      ele.addEventListener("keydown", function (e) {
        const { keyCode, key } = e

        window.ReactNativeWebView.postMessage(JSON.stringify({ event: { keyCode, key }, eventType: ${WEBVIEW_POST_EVENTS.onKeyDown} }))
      });

      ele.addEventListener("keyup", function (e) {
        const text = e.target.innerHTML.trim()

        window.ReactNativeWebView.postMessage(JSON.stringify({ event: text, eventType: ${WEBVIEW_POST_EVENTS.onChange} }))
      });

      ele.addEventListener("copy", function (e) {
        const selectedText = getSelection().getRangeAt(0).toString();
        e.clipboardData.setData("text/plain", selectedText);
        const content = e.clipboardData.getData('text/plain');
      });

      ele.addEventListener("paste", function (e) {
        const plainText = e.clipboardData.getData('text/plain')
        const htmlText = e.clipboardData.getData('text/html')

        e.preventDefault()
        window.ReactNativeWebView.postMessage(JSON.stringify({
          event: {
            plainText,
            htmlText,
            innerHTML: ele?.innerHTML
          },
          eventType: ${WEBVIEW_POST_EVENTS.onPaste}
        }))
      });
    });
  </script>

  <body>
    <div
      id="content"
      contenteditable
      placeholder="${props.placeholder}"
    >
      ${html}
    </div>
  </body>
</html>
    `

  return (
    <View style={commonStyles.flexOne}>
      <WebView
        key='web-view'
        ref={contentRef}
        originWhitelist={['*']}
        source={{
          html: _html,
        }}
        hideKeyboardAccessoryView={true}
        keyboardDisplayRequiresUserAction={false}
        domStorageEnabled={false}
        javaScriptEnabled
        onMessage={event => {
          const { eventType, event: webEvent, text } = JSON.parse(event.nativeEvent.data)

          switch (eventType) {
            case WEBVIEW_POST_EVENTS.onFocus: {
              // @ts-ignore
              window.getSelection = () => contentRef?.current?.injectJavaScript('getSelectionValues()')

              if (props.onFocus) props.onFocus()
              break
            }

            case WEBVIEW_POST_EVENTS.onBlur: {
              handleInput(text)

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

            // TODO: improve onChange event: if we use oninput to listen to changes on the text the component ends up rendering and taking cursor focus and dismissing the keyboard.
            case WEBVIEW_POST_EVENTS.onChange: {
              // handleInput(webEvent)
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
