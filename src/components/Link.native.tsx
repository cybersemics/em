import React from 'react'
import { useDispatch } from 'react-redux'
import search from '../action-creators/search'
import searchContexts from '../action-creators/searchContexts'
import setCursor from '../action-creators/setCursor'
import toggleSidebar from '../action-creators/toggleSidebar'
import head from '../util/head'
import strip from '../util/strip'
import { StyleSheet } from 'react-native'
import { Text } from './Text.native'
import { store } from '../store'
import getThoughtById from '../selectors/getThoughtById'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import * as selection from '../device/selection'
import SimplePath from '../@types/SimplePath'

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
