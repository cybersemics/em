import React from 'react'
import { useDispatch } from 'react-redux'
import { search, searchContexts, setCursor, toggleSidebar } from '../action-creators'
import { headValue, strip } from '../util'
import { StyleSheet } from 'react-native'
import { Text } from './Text.native'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import clearSelection from '../device/clearSelection'
import { SimplePath } from '../@types'

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
        dispatch([
          search({ value: null }),
          searchContexts({ value: null }),
          setCursor({ path: simplePath }),
          toggleSidebar({ value: false }),
          scrollCursorIntoView(),
        ])
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
