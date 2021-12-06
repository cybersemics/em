import React from 'react'
import { useDispatch } from 'react-redux'
import { search, searchContexts, setCursor, toggleSidebar } from '../action-creators'
import { head, strip } from '../util'
import { StyleSheet } from 'react-native'
import { Text } from './Text.native'
import { store } from '../store'
import { getThoughtById } from '../selectors'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import * as selection from '../device/selection'
import { SimplePath } from '../@types'

interface LinkProps {
  charLimit?: number
  label?: string
  simplePath: SimplePath
}

/** Renders a link with the appropriate label to the given context. */
const Link = ({ simplePath, label, charLimit = 32 }: LinkProps) => {
  const thought = getThoughtById(store.getState(), head(simplePath))

  const value = label || strip(thought.value)

  const dispatch = useDispatch()

  return (
    <Text
      style={style.text}
      onPress={() => {
        selection.clear()
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
