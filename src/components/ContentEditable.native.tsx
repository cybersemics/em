/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useDimensions } from '@react-native-community/hooks'
import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { WebView } from 'react-native-webview'
import { WEBVIEW_POST_EVENTS, createWebHTML } from '../device/createWebHTML.native'
import { commonStyles } from '../style/commonStyles'

interface ContentEditableProps {
  style?: ViewStyle
  html: string
  disabled?: boolean
  isEditing?: boolean
  forceUpdate?: boolean
  onChange: (e: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onPaste?: (e: IOnPaste) => void
  onKeyDown?: (e: IKeyDown) => void
  placeholder: string
  isTable?: boolean
  space?: number
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

const DEFAULT_WEBVIEW_HEIGHT = 25

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
  isTable,
  space,
  ...props
}: ContentEditableProps) => {
  const allowInnerHTMLChange = useRef<boolean>(true)
  const { width } = useDimensions().window

  const [height, setHeight] = useState(DEFAULT_WEBVIEW_HEIGHT)
  const contentRef = useRef<WebView>(null)
  const innerHTMLValue = useRef<string>(html)

  const [webviewHTML, setWebviewHTML] = useState<string>(
    createWebHTML({ innerHTML: html, placeholder, isEditing, isTable }),
  )

  useEffect(() => {
    setWebviewHTML(createWebHTML({ innerHTML: html, placeholder, isEditing, isTable }))
  }, [isEditing, isTable])

  useEffect(() => {
    if (html.trim() === innerHTMLValue?.current?.trim()) return

    arrangeInputContainer(html)
    setWebviewHTML(createWebHTML({ innerHTML: html, placeholder, isEditing, isTable }))
  }, [html])

  useEffect(() => {
    arrangeInputContainer(html)
  }, [])

  /** Helper function to determine the height of the input element. */
  const arrangeInputContainer = (innerHTML: string) => {
    const rows = Math.ceil(innerHTML.length / 30)

    const newHeight = (rows === 0 ? 1 : rows) * DEFAULT_WEBVIEW_HEIGHT

    if (newHeight !== DEFAULT_WEBVIEW_HEIGHT) {
      setHeight(rows * DEFAULT_WEBVIEW_HEIGHT)

      return
    }

    setHeight(DEFAULT_WEBVIEW_HEIGHT)
  }

  // eslint-disable-next-line jsdoc/require-jsdoc
  const handleInput = (e: string) => {
    const inputValue = e.replace(/&nbsp;/g, ' ').trim()

    // prevent innerHTML update when editing
    allowInnerHTMLChange.current = false

    arrangeInputContainer(inputValue)
    innerHTMLValue.current = inputValue
    props.onChange(inputValue)
  }

  return (
    <View style={[commonStyles.flexOne, styles({ isEditing }).container]}>
      <WebView
        ref={contentRef}
        originWhitelist={['*']}
        source={{
          html: webviewHTML,
        }}
        hideKeyboardAccessoryView={true}
        domStorageEnabled={false}
        javaScriptEnabled
        keyboardDisplayRequiresUserAction={false}
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
              setWebviewHTML(createWebHTML({ innerHTML: html, placeholder, isTable }))

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
        style={styles({ width: !isTable ? width - (space || 0) : width - 40, height }).webview}
      />
    </View>
  )
}

interface IStyle {
  height?: number
  width?: number
  isEditing?: boolean
}

/** Style. */
const styles = ({ width = 0, height, isEditing = false }: IStyle) =>
  StyleSheet.create({
    webview: {
      width: width - 25,
      height,
      marginTop: 10,
      marginHorizontal: 5,
      backgroundColor: 'transparent',
    },
    container: { opacity: isEditing ? 1 : 0.5 },
  })

export declare type ContentEditableEvent = string

export default ContentEditable
