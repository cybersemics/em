import React from 'react'
import { useDispatch } from 'react-redux'
// import { EM_TOKEN } from '../constants'
import { scrollCursorIntoView, search, searchContexts, setCursor, toggleSidebar } from '../action-creators'
import {
  clearSelection,
  // decodeCharacterEntities,
  // ellipsize,
  // equalArrays,
  headValue,
  // pathToContext,
  strip,
} from '../util'
import { StyleSheet } from 'react-native'
import { SimplePath } from '../@types'
import { Text } from './Text.native'

interface LinkProps {
  charLimit?: number
  label?: string
  simplePath: SimplePath
}

/** Renders a link with the appropriate label to the given context. */
const Link = ({ simplePath, label, charLimit = 32 }: LinkProps) => {
  const value = label || strip(headValue(simplePath))

  const dispatch = useDispatch()

  return (
    <Text
      style={style.text}
      onPress={() => {
        clearSelection()
        dispatch(search({ value: null }))
        dispatch(searchContexts({ value: null }))
        dispatch(setCursor({ path: simplePath }))
        dispatch(toggleSidebar({ value: false }))
        dispatch(scrollCursorIntoView())
      }}
    >
      {value}
    </Text>
  )
}

const style = StyleSheet.create({
  text: { fontSize: 4 },
})

export default Link
